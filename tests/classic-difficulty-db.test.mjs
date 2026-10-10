// Execute the migration and real RPC bodies against disposable PostgreSQL.
// No production access. Reuse the isolated pinned PGlite runtime from season QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const runtime=new URL('../../outputs/season-reset-20261010/test-runtime/node_modules/@electric-sql/pglite/dist/index.js',import.meta.url);
const {PGlite}=await import(process.env.PGLITE_MODULE_PATH?pathToFileURL(process.env.PGLITE_MODULE_PATH).href:runtime.href);
const before=JSON.parse(fs.readFileSync(new URL('./fixtures/classic-difficulty-db-baseline.json',import.meta.url),'utf8'));
const migration=fs.readFileSync(new URL('../supabase/migrations/20261010080734_classic_difficulty_20261010.sql',import.meta.url),'utf8');
const db=await PGlite.create('memory://');
const rows=async(sql,args=[])=>(await db.query(sql,args)).rows;
const one=async(sql,args=[])=>(await rows(sql,args))[0];
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const owner=id(1),other=id(2);
const fractions={Bronze:.85,Silver:.85,Gold:.85,Elite:.85,Icon:.6};
const sqlQuote=s=>"'"+s.replaceAll("'","''")+"'";
try{
 await db.exec(`create role anon; create role authenticated; create role service_role;
 create schema auth; create schema extensions; create schema app_private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 -- Randomness and hashing are storage-boundary stand-ins, not part of this dial.
 create function extensions.gen_random_bytes(integer) returns bytea language sql as $$select decode(repeat('a1',$1),'hex')$$;
 create function extensions.digest(text,text) returns bytea language sql as $$select decode(md5($1)||md5($1),'hex')$$;
 create table profiles(id uuid primary key,public_id uuid default gen_random_uuid());
 create table rulesets(version text primary key,validator_version text not null,enabled boolean not null);
 create table game_runs(id uuid primary key default gen_random_uuid(),user_id uuid,mode text,rules_version text,draft_seed text,nonce_hash text,status text default 'started',created_at timestamptz default now(),updated_at timestamptz default now(),expires_at timestamptz default now()+interval '1 day',draft_fairness jsonb,card_cycle_recorded jsonb default '[]',submitted_at timestamptz,challenge_id uuid);
 create table draft_offer_history(user_id uuid primary key,state jsonb default '{}',updated_at timestamptz default now());
 create table async_challenges(id uuid,status text,created_by uuid,opponent_id uuid,winner_id uuid,completed_at timestamptz,rules_version text);
 create table challenge_entries(challenge_id uuid,run_id uuid,user_id uuid,side smallint,roster jsonb,transcript jsonb,score numeric,team_ovr numeric,projected_wins smallint,result_digest text);
 create table leaderboard_entries(id uuid default gen_random_uuid(),run_id uuid unique,user_id uuid,mode text,points numeric,wins smallint,losses smallint,team_ovr numeric,roster jsonb,transcript jsonb,result_digest text,rules_version text,challenge_id uuid,created_at timestamptz default now());
 create table app_private.classic_draft_seasons(singleton boolean,season_id text,name text,starts_at timestamptz);
 create table cloud_saves(user_id uuid,payload jsonb,revision bigint);
 revoke all on game_runs,draft_offer_history,cloud_saves,app_private.classic_draft_seasons from public,anon,authenticated;`);
 for(const f of before.functions){
  await db.exec(f.definition.trimEnd()+';');
  const signature=(await one("select oid::regprocedure::text as signature from pg_proc where proname=$1",[f.name])).signature;
  const actual=await one('select md5(pg_get_functiondef($1::regprocedure)) as hash',[signature]);
  assert.equal(actual.hash,f.hash,'Fixture must reproduce the inspected definition before migration');
  await db.exec('revoke all on function '+signature+' from public; grant execute on function '+signature+' to service_role;'+(f.name==='create_ranked_run'?'grant execute on function '+signature+' to authenticated;':''));
 }
 for(const r of before.rules)await db.query('insert into rulesets values($1,$2,$3)',[r.version,r.validator_version,r.enabled]);
 await db.query('insert into profiles(id) values($1),($2)',[owner,other]);
 const season=before.season[0];await db.query('insert into app_private.classic_draft_seasons values(true,$1,$2,$3)',[season.season_id,season.name,season.starts_at]);
 await db.query('insert into cloud_saves values($1,$2,37)',[owner,{credits:1250,trophies:['perfect-draft'],ownedEffects:['lebron-heavy-is-the-head']}]);
 const snapshot=async()=>one(`select (select jsonb_agg(t) from app_private.classic_draft_seasons t) as season,(select jsonb_agg(t) from cloud_saves t) as saves,(select jsonb_agg(jsonb_build_object('name',proname,'acl',proacl::text) order by proname) from pg_proc where proname in ('create_ranked_run','finalize_validated_run','initialize_card_cycle_rarity','record_card_cycle')) as grants`);
 const preserved=await snapshot();await db.exec(migration);assert.deepEqual(await snapshot(),preserved,'Season cutoff, rewards and RPC ACLs stay unchanged');
 assert.equal((await rows("select * from rulesets where version in ('atu-classic-v15','atu-history-draft-v13') and validator_version='atu-classic-difficulty-v1' and enabled")).length,2);
 const current=await rows("select proname,pg_get_functiondef(oid) as definition from pg_proc where proname in ('create_ranked_run','finalize_validated_run','initialize_card_cycle_rarity','record_card_cycle')");
 for(const f of current){
  let expected=before.functions.find(x=>x.name===f.proname).definition.replaceAll("'atu-classic-v14','atu-history-draft-v12'","'atu-classic-v14','atu-history-draft-v12','atu-classic-v15','atu-history-draft-v13'");
  if(f.proname==='initialize_card_cycle_rarity')expected=expected.replace("'atu-classic-v13','atu-classic-v14'","'atu-classic-v13','atu-classic-v14','atu-classic-v15'");
  if(f.proname==='record_card_cycle')expected=expected.replace("'atu-classic-v12','atu-classic-v13','atu-classic-v14'","'atu-classic-v12','atu-classic-v13','atu-classic-v14','atu-classic-v15'");
  assert.equal(f.definition,expected,'Only new version registration/pool mapping may change RPC bodies');
 }
 await db.exec('begin');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);
 await assert.rejects(db.query("select * from create_ranked_run('draft','atu-classic-v999')"),/not active/);
 // Failed SQL aborts a transaction: isolate expected rejections using savepoints.
 await db.exec('rollback; begin');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);
 const reject=async(sql,args,pattern)=>{await db.exec('savepoint expected_error');try{await assert.rejects(db.query(sql,args),pattern);}finally{await db.exec('rollback to savepoint expected_error; release savepoint expected_error');}};
 for(const [version,pool]of [['atu-classic-v15','modern'],['atu-history-draft-v13','history'],['atu-classic-v14','modern'],['atu-history-draft-v12','history']]){
  const run=await one("select * from create_ranked_run('draft',$1)",[version]);assert.equal(run.rules_version,version);
  await reject('select initialize_card_cycle_rarity($1,$2,$3,$4)',[run.run_id,owner,pool==='modern'?'history':'modern',fractions],/pool does not match/);
  const fairness=(await one('select initialize_card_cycle_rarity($1,$2,$3,$4) as value',[run.run_id,owner,pool,fractions])).value;
  assert.equal(fairness.kind,'card-cycle-rarity-v1');assert.deepEqual(fairness.releaseFractions,fractions);
  assert.deepEqual((await one('select initialize_card_cycle_rarity($1,$2,$3,$4) as value',[run.run_id,owner,pool,fractions])).value,fairness);
  const events=[{type:'offer',tier:'Gold',cardId:100+Number(version.match(/\d+$/)[0])}];
  await db.query('select record_card_cycle($1,$2,$3)',[run.run_id,owner,events]);
  const history=await one('select state from draft_offer_history where user_id=$1',[owner]);
  await db.query('select record_card_cycle($1,$2,$3)',[run.run_id,owner,events]);
  assert.deepEqual(await one('select state from draft_offer_history where user_id=$1',[owner]),history,'Retry must not double count offers');
  await reject('select record_card_cycle($1,$2,$3)',[run.run_id,other,events],/not found/);
  const finalize='select * from finalize_validated_run($1,$2,$3,$4,$5,$6,$7,$8::smallint,$9)';
  await reject(finalize,[run.run_id,owner,run.run_token,{},[{type:'arrange',roster:{}}],1100,99,81,'a'.repeat(64)],/Only validated 82-0/);
  const result=await one(finalize,[run.run_id,owner,run.run_token,{},[{type:'arrange',roster:{}}],1100,99,82,'a'.repeat(64)]);assert.equal(result.outcome,'completed');
 }
 await db.exec('rollback');
 assert.deepEqual(await snapshot(),preserved,'Disposable calls and migration must not modify season/reward fixture');
 console.log('Classic difficulty DB migration/RPC regressions passed');
}finally{await db.close();}
