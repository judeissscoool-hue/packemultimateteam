import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
import * as engine from '../supabase/functions/_shared/atu-engine-card-cycle-identity-20261007.js';
import {draftExposure} from '../supabase/functions/_shared/draft-history.js';
import {CARDS as modern} from '../supabase/functions/_shared/ratings-20260920/modern-data.js';
import {CARDS as history} from '../supabase/functions/_shared/ratings-20260920/history-data.js';

const tiers=['Bronze','Silver','Gold','Elite','Icon'];
const cardsByPool={modern,history};
const versions={modern:'atu-classic-v14',history:'atu-history-draft-v12'};
const scalarVersions={modern:'atu-classic-v12',history:'atu-history-draft-v10'};
const currentReleaseFraction=.9;
const currentReleaseFractions={Bronze:.85,Silver:.85,Gold:.85,Elite:.85,Icon:.6};
const slots=['B1','B2','B3','C','PF','SF','SG','PG'];
const token='a'.repeat(64),wrongToken='b'.repeat(64);
const hash=value=>createHash('sha256').update(value).digest('hex');
const plain=value=>JSON.parse(JSON.stringify(value));
const empty=()=>Object.fromEntries(tiers.map(tier=>[tier,[]]));
const runRows=new Map(),cycles=new Map(),journals=new Map(),activeRuns=new Map(),calls=[];
let createdRuns=0,finalizedRuns=0;
const scope=(owner,pool)=>owner+'|'+pool;
const poolForVersion=version=>version.startsWith('atu-history-')?'history':'modern';
function getCycle(owner,pool){const key=scope(owner,pool);if(!cycles.has(key))cycles.set(key,empty());return cycles.get(key);}
function nonceHash(value){return hash(value);}
function row(number,version,owner='owner',mode='draft'){
 const id=`00000000-0000-4000-8000-${String(number).padStart(12,'0')}`;
 return {id,user_id:owner,mode,rules_version:version,draft_seed:hash('card-cycle-handler-seed-'+number),status:'started',expires_at:'2099-01-01',nonce_hash:nonceHash(token),draft_fairness:null};
}
function rpcError(message){return {error:{message}};}
function initializeCycleSnapshot(stored,args){
 assert.equal(args.p_pool,poolForVersion(stored.rules_version));
 const rarityPolicy=stored.rules_version===versions[args.p_pool];
 if(rarityPolicy)assert.deepEqual(plain(args.p_release_fractions),currentReleaseFractions);
 else{assert.equal(stored.rules_version,scalarVersions[args.p_pool]);assert.equal(args.p_release_fraction,currentReleaseFraction);}
 if(!stored.draft_fairness){
  stored.draft_fairness={...(rarityPolicy?{kind:'card-cycle-rarity-v1',releaseFractions:plain(args.p_release_fractions)}:{kind:'card-cycle-v1',releaseFraction:args.p_release_fraction}),shown:tiers.flatMap(tier=>getCycle(stored.user_id,args.p_pool)[tier])};
  journals.set(stored.id,[]);activeRuns.set(scope(stored.user_id,args.p_pool),stored.id);
 }
 return {data:plain(stored.draft_fairness)};
}
function applyDelta(cycle,event,pool){
 assert(tiers.includes(event.tier),'Only known rarities enter mock persistence');
 if(event.type==='reset'){cycle[event.tier]=[];return;}
 const card=cardsByPool[pool].find(card=>card.id===event.cardId);
 assert(card&&card.r===event.tier,'Only approved, correctly classified exact IDs enter persistence');
 const queue=cycle[event.tier],old=queue.indexOf(event.cardId);if(old!==-1)queue.splice(old,1);
 if(event.type==='offer')queue.push(event.cardId);
 else assert.equal(event.type,'release');
}

// Execute the real handler sources. The mock replaces only authentication and
// RPC/storage boundaries; SQL behavior itself is verified by separate DB tests.
const edgeEnv={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server-only'};
function edgeHandler(name){
 const raw=fs.readFileSync(new URL(`../supabase/functions/${name}/index.ts`,import.meta.url),'utf8');
 assert.match(raw,/atu-engine-card-cycle-identity-20261007\.js/,'The real handler must import the current rarity-cycle router while retaining scalar versions');
 const source=raw.replace(/import[\s\S]*?from "[^"]+";\r?\n/g,'');
 let handler;
 const context=vm.createContext({...engine,console,Response,Request,Headers,TextEncoder,crypto:webcrypto,draftExposure,
  corsHeaders:{'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'},
  Deno:{env:{get:key=>edgeEnv[key]},serve:fn=>{handler=fn;}},
  createClient(_url,key,options){
   const sessionToken=options?.global?.headers?.Authorization?.replace(/^Bearer /,'');
   const actor=sessionToken==='valid-other'?'owner-other':'owner';
   if(key==='anon')return {
    auth:{async getUser(value){return ['valid-session','valid-other'].includes(value)?{data:{user:{id:actor}}}:{data:{user:null},error:{message:'Invalid session'}};}},
    async rpc(rpc,args){
     calls.push({rpc,args:plain(args)});assert.equal(rpc,'create_ranked_run');assert.equal(args.p_mode,'draft');
     const stored=row(++createdRuns,args.p_rules_version,actor);runRows.set(stored.id,stored);
     return {data:[{run_id:stored.id,run_token:token,draft_seed:stored.draft_seed,rules_version:stored.rules_version,expires_at:stored.expires_at}]};
    }
   };
   assert.equal(key,'server-only');
   return {
    from(table){assert.equal(table,'game_runs');let requested;return {select(){return this;},eq(field,value){assert.equal(field,'id');requested=value;return this;},async maybeSingle(){return {data:runRows.has(requested)?plain(runRows.get(requested)):null};}};},
    async rpc(rpc,args){
     calls.push({rpc,args:plain(args)});
     const stored=runRows.get(args.p_run_id);if(!stored||stored.user_id!==args.p_user_id)return rpcError('Invalid run owner');
     if(rpc==='initialize_card_cycle_rarity'){
      assert.equal(stored.rules_version,versions[args.p_pool]);return initializeCycleSnapshot(stored,args);
     }
     if(rpc==='initialize_card_cycle'){
      assert.equal(stored.rules_version,scalarVersions[args.p_pool]);return initializeCycleSnapshot(stored,args);
     }
     if(rpc==='record_card_cycle'){
      const events=plain(args.p_events),accepted=journals.get(stored.id);assert(accepted,'Initialize a snapshot before recording cycle events');
      const sharedLength=Math.min(accepted.length,events.length);
      if(JSON.stringify(accepted.slice(0,sharedLength))!==JSON.stringify(events.slice(0,sharedLength)))return rpcError('Invalid card-cycle event prefix');
      if(events.length<=accepted.length)return {data:{applied:false,recorded:accepted.length}};
      const pool=poolForVersion(stored.rules_version),cycle=getCycle(stored.user_id,pool);
      if(activeRuns.get(scope(stored.user_id,pool))===stored.id)for(const event of events.slice(accepted.length))applyDelta(cycle,event,pool);
      journals.set(stored.id,events);return {data:{applied:true,recorded:events.length}};
     }
     if(rpc==='initialize_draft_fairness'){
      stored.draft_fairness={session:0,shown:{},last:{},cards:{}};return {data:plain(stored.draft_fairness)};
     }
     if(rpc==='record_draft_exposure')return {data:{recorded:true}};
     assert.equal(rpc,'finalize_validated_run');
     if(nonceHash(args.p_run_token)!==stored.nonce_hash)return rpcError('Invalid run token');
     assert.match(args.p_result_digest,/^[a-f0-9]{64}$/);assert.equal(Object.keys(args.p_roster).length,8);
     finalizedRuns++;return {data:[{outcome:'creator_completed',challenge_status:'open'}]};
    }
   };
  }
 });
 vm.runInContext(stripTypeScriptTypes(source),context);assert.equal(typeof handler,'function');return handler;
}
const historyHandler=edgeHandler('draft-history'),validateHandler=edgeHandler('validate-run');
const request=(name,body,auth='valid-session')=>new Request(`https://example.supabase.co/functions/v1/${name}`,{method:'POST',headers:{origin:'https://www.packemultimateteam.com',authorization:'Bearer '+auth,'content-type':'application/json'},body:JSON.stringify(body)});
async function start(pool,previous,version=versions[pool],auth='valid-session',extras={}){
 const result=await historyHandler(request('draft-history',{action:'start',pool,rulesVersion:version,...(previous?{previous}:{}),...extras},auth));
 assert.equal(result.status,200,JSON.stringify(await result.clone().json()));return (await result.json()).run;
}
const saved=(run,events)=>({runId:run.run_id,runToken:run.run_token,events:plain(events)});
async function checkpoint(previous,expected=200,auth='valid-session'){
 const result=await historyHandler(request('draft-history',{action:'checkpoint',previous},auth));assert.equal(result.status,expected);return result;
}
function play(run,limit=7,fairness=run.draft_fairness){
 const session=engine.createClassicSession(run.draft_seed,[],run.rules_version,fairness),events=[];
 const apply=event=>{session.apply(event);events.push(event);};
 const highest=cards=>cards.reduce((a,b)=>b.ovr>a.ovr?b:a);
 apply({type:'captain',cardId:highest(session.draft.captain).id});
 for(const slot of slots)if(session.draft.roster[slot]==null&&session.draft.taken.length<limit){apply({type:'open',slot});apply({type:'pick',cardId:highest(session.draft.opts).id});}
 assert.equal(session.draft.taken.length,limit);return {session,events};
}
function assertCycleSequence(pool,snapshot,events){
 const byId=new Map(cardsByPool[pool].map(card=>[card.id,card]));
 const cycle=empty();for(const id of snapshot.shown)cycle[byId.get(id).r].push(id);
 const thresholds=Object.fromEntries(tiers.map(tier=>[tier,Math.ceil(cardsByPool[pool].filter(card=>card.r===tier).length*(snapshot.releaseFractions?.[tier]??snapshot.releaseFraction))]));
 let goldResets=0,iconResets=0;
 for(const event of events){
  const queue=cycle[event.tier];
  if(event.type==='reset'){
   assert(queue.length>=thresholds[event.tier],`A rarity must reach its saved threshold before whole-cycle release`);
   if(event.tier==='Gold')goldResets++;
   if(event.tier==='Icon')iconResets++;
  }else if(event.type==='release')assert(queue.includes(event.cardId),'A position release must remove a protected exact ID');
  else{assert.equal(event.type,'offer');assert(!queue.includes(event.cardId),'An exact ID must not repeat before a reset or explicit scarce-position release');}
  applyDelta(cycle,event,pool);
 }
 return {cycle,goldResets,iconResets};
}
const cycleCalls=()=>calls.filter(call=>['initialize_card_cycle','initialize_card_cycle_rarity','record_card_cycle'].includes(call.rpc)).length;

// Persist realistic seven-pick restarts through both account pools until the
// Gold and Icon pools cross their distinct 85% and 60% thresholds. Retry full
// and short checkpoints in reverse order through the actual HTTP handlers.
let totalGoldResets=0;
for(const pool of ['modern','history']){
 const otherPool=pool==='modern'?'history':'modern',otherBefore=plain(getCycle('owner',otherPool));
 let previous=null,previousRun=null,goldResets=0,iconResets=0,firstRun,firstSnapshot;
 for(let attempt=0;attempt<60&&(goldResets===0||iconResets===0);attempt++){
  const before=plain(getCycle('owner',pool));
  const run=await start(pool,previous);assert.equal(run.rules_version,versions[pool]);
  assert.deepEqual(run.draft_fairness,{kind:'card-cycle-rarity-v1',releaseFractions:currentReleaseFractions,shown:tiers.flatMap(tier=>before[tier])});
  if(previousRun){
   const currentHistory=plain(getCycle('owner',pool)),lateFinish=play(previousRun,8);
   await checkpoint(saved(previousRun,lateFinish.events));await checkpoint(previous);
   assert.deepEqual(getCycle('owner',pool),currentHistory,'A stale tab finishing an older run must not mutate the active restart cycle');
  }
  if(!firstRun){firstRun=run;firstSnapshot=plain(run.draft_fairness);}
  const initialSnapshot=plain(run.draft_fairness),{session,events}=play(run);
  assert.deepEqual(run.draft_fairness,initialSnapshot,'Playing must not mutate the run snapshot');
  const verified=assertCycleSequence(pool,initialSnapshot,session.draft.cardCycle.events);goldResets+=verified.goldResets;iconResets+=verified.iconResets;
  assert.deepEqual(verified.cycle,session.draft.cardCycle.shown);
  previous=saved(run,events);previousRun=run;
  await checkpoint(saved(run,events.slice(0,3)));await checkpoint(previous);
  const afterFull=plain(getCycle('owner',pool));assert.deepEqual(afterFull,verified.cycle,'Trusted checkpoint must persist all offers, reset and release deltas');
  await checkpoint(previous);await checkpoint(saved(run,events.slice(0,3)));await checkpoint(saved(run,[]));
  assert.deepEqual(getCycle('owner',pool),afterFull,'Retries and older prefixes must never replay history mutations');
  assert.deepEqual(runRows.get(firstRun.run_id).draft_fairness,firstSnapshot,'Later restarts must not rewrite an earlier immutable snapshot');
  assert.deepEqual(engine.createClassicSession(run.draft_seed,events,run.rules_version,initialSnapshot).draft,session.draft,'Server replay uses the original snapshot after later account mutations');
 }
 assert(goldResets>0,`Real ${pool} Gold offers must exercise the 85% release boundary`);assert(iconResets>0,`Real ${pool} Icon offers must exercise the 60% release boundary`);totalGoldResets+=goldResets;
 assert.deepEqual(getCycle('owner',otherPool),otherBefore,'History must be isolated between roster pools');
 console.log(`${pool}: account checkpoints/retries/seven-pick restarts reached both Gold 85% and Icon 60% release boundaries`);
}
assert(totalGoldResets>=2);
const otherAccount=await start('modern',null,versions.modern,'valid-other');assert.deepEqual(otherAccount.draft_fairness.shown,[],'Accounts must not share cycle history');

// A run started under the former 75% policy must replay at 75%, even after the
// trusted new-start setting becomes a rarity map. The mock models the immutable RPC
// retry contract; real handler checkpoint/restart replay is exercised below.
{
 const pool='modern',owner='owner-other',legacy=row(++createdRuns,scalarVersions.modern,owner);
 const gold=modern.filter(card=>card.r==='Gold'),shown=gold.slice(0,Math.ceil(gold.length*.75)-1).map(card=>card.id);
 legacy.draft_seed=hash('saved-75-percent-card-cycle');
 legacy.draft_fairness={kind:'card-cycle-v1',releaseFraction:.75,shown};runRows.set(legacy.id,legacy);
 const cycle=empty();cycle.Gold=[...shown];cycles.set(scope(owner,pool),cycle);journals.set(legacy.id,[]);activeRuns.set(scope(owner,pool),legacy.id);
 const immutable=plain(legacy.draft_fairness),args={p_pool:pool,p_release_fraction:currentReleaseFraction};
 assert.deepEqual(initializeCycleSnapshot(legacy,args).data,immutable,'Retrying initialization must return the saved 75% snapshot');
 const run={run_id:legacy.id,run_token:token,draft_seed:legacy.draft_seed,rules_version:legacy.rules_version,draft_fairness:plain(immutable)};
 const {session,events}=play(run),verified=assertCycleSequence(pool,immutable,session.draft.cardCycle.events);
 assert(verified.goldResets>0,'The saved run must release Gold at its original 75% boundary, before the new 85% boundary');
 await checkpoint(saved(run,events),200,'valid-other');
 assert.deepEqual(getCycle(owner,pool),verified.cycle,'The current handler must persist a saved 75% run using its original snapshot');
 assert.deepEqual(engine.createClassicSession(run.draft_seed,events,run.rules_version,immutable).draft,session.draft);
 const beforeReplacement=plain(getCycle(owner,pool));
 const replacement=await start(pool,saved(run,events),versions.modern,'valid-other');
 assert.deepEqual(replacement.draft_fairness.releaseFractions,currentReleaseFractions,'The next restart must receive per-rarity protection');
 assert.deepEqual(replacement.draft_fairness.shown,tiers.flatMap(tier=>beforeReplacement[tier]),'Upgrading the rules must retain shared exact-card history');
 const accepted=plain(journals.get(legacy.id));
 assert.deepEqual(initializeCycleSnapshot(legacy,args).data,immutable,'A later initialization retry must not rewrite the old run');
 assert.deepEqual(journals.get(legacy.id),accepted,'An initialization retry must not erase accepted events');
 assert.equal(activeRuns.get(scope(owner,pool)),replacement.run_id,'Retrying an old snapshot must not reactivate its run');
 assert.deepEqual(legacy.draft_fairness,immutable);
}

// Old rules remain startable and replayable. None may initialize or record the
// new card cycle; older exposure-based versions retain their own existing RPCs.
for(const pool of ['modern','history']){
 const oldVersions=pool==='modern'?Array.from({length:8},(_,i)=>'atu-classic-v'+(i+4)):Array.from({length:8},(_,i)=>'atu-history-draft-v'+(i+2));
 for(const version of oldVersions){
  const beforeCalls=cycleCalls(),before=plain(getCycle('owner',pool)),run=await start(pool,null,version);
  const {session,events}=play(run);await checkpoint(saved(run,events));
  assert.equal(cycleCalls(),beforeCalls,'Frozen '+version+' must not touch new cycle RPCs');assert.deepEqual(getCycle('owner',pool),before);
  assert.deepEqual(engine.createClassicSession(run.draft_seed,events,version,run.draft_fairness).draft,session.draft,'Frozen '+version+' must still replay');
 }
}

// Untrusted auth, ownership, tokens or draft actions must fail before a history
// RPC can mutate protection. Client-supplied cycle/snapshot fields are ignored.
{
 const run=await start('modern'),{session,events}=play(run),previous=saved(run,events),before=plain(getCycle('owner','modern'));
 const beforeInvalid=createdRuns,beforeCalls=cycleCalls();
 assert.equal((await historyHandler(request('draft-history',{action:'start',pool:'modern',rulesVersion:versions.modern},'invalid-session'))).status,401);
 assert.equal(createdRuns,beforeInvalid);assert.equal(cycleCalls(),beforeCalls);
 await checkpoint({...previous,runToken:wrongToken},400);await checkpoint(previous,400,'valid-other');
 const forged=plain(previous);forged.events[0].cardId=999999;await checkpoint(forged,400);
 await checkpoint({...previous,events:[...previous.events,{type:'offer',cardId:0}]},400);
 assert.equal(cycleCalls(),beforeCalls);assert.deepEqual(getCycle('owner','modern'),before);
 const corrupted=runRows.get(run.run_id),goodSnapshot=plain(corrupted.draft_fairness);corrupted.draft_fairness={kind:'card-cycle-rarity-v1',releaseFractions:currentReleaseFractions,shown:[999999]};
 await checkpoint(previous,400);assert.equal(cycleCalls(),beforeCalls);corrupted.draft_fairness=goodSnapshot;
 await checkpoint({...previous,cardCycle:{events:[{type:'offer',cardId:999999,tier:'Gold'}]},draft_fairness:{shown:[999999]}});
 assert.deepEqual(getCycle('owner','modern'),session.draft.cardCycle.shown,'Only server-replayed offers may change history');
 const mismatchBefore=createdRuns;
 assert.equal((await historyHandler(request('draft-history',{action:'start',pool:'modern',rulesVersion:versions.history}))).status,400);assert.equal(createdRuns,mismatchBefore);
 const stateBefore=plain(getCycle('owner','modern'));
 const tamperedStart=await start('modern',null,versions.modern,'valid-session',{draft_fairness:{kind:'card-cycle-rarity-v1',releaseFractions:{...currentReleaseFractions,Icon:.01},shown:[999999]},releaseFractions:{Icon:.01},protection:{shown:[999999]}});
 assert.deepEqual(tamperedStart.draft_fairness.shown,tiers.flatMap(tier=>stateBefore[tier]));assert.deepEqual(tamperedStart.draft_fairness.releaseFractions,currentReleaseFractions);
 const forgedPolicy=plain(runRows.get(tamperedStart.run_id).draft_fairness);forgedPolicy.releaseFractions.Icon=0;
 runRows.get(tamperedStart.run_id).draft_fairness=forgedPolicy;const beforeBadPolicy=cycleCalls();
 await checkpoint(saved(tamperedStart,[]),400);assert.equal(cycleCalls(),beforeBadPolicy,'Malformed stored policy must fail before recording cycle events');
}

// The real HTTP validator accepts new-version Classic duel transcripts and
// rejects forged actions/tokens before finalizing. Account snapshots separately
// remain part of normal-draft replay; ranked drafts still require 82-0.
for(const pool of ['modern','history']){
 const number=++createdRuns,duel=row(number,versions[pool],'owner','one_v_one');runRows.set(duel.id,duel);
 const run={run_id:duel.id,run_token:token,draft_seed:duel.draft_seed,rules_version:duel.rules_version,draft_fairness:null};
 const {session,events}=play(run,8),body={runId:run.run_id,runToken:token,transcript:[...events,{type:'arrange',roster:session.draft.roster}]};
 const before=finalizedRuns,valid=await validateHandler(request('validate-run',body));assert.equal(valid.status,200);assert.equal((await valid.json()).ok,true);assert.equal(finalizedRuns,before+1);
 const invalid=plain(body);invalid.transcript[0].cardId=999999;assert.equal((await validateHandler(request('validate-run',invalid))).status,422);assert.equal(finalizedRuns,before+1);
 assert.equal((await validateHandler(request('validate-run',{...body,runToken:wrongToken}))).status,409);assert.equal(finalizedRuns,before+1);
 assert.equal((await validateHandler(request('validate-run',body,'valid-other'))).status,404);assert.equal(finalizedRuns,before+1);
 const account=await start(pool),played=play(account,8),transcript=[...played.events,{type:'arrange',roster:played.session.draft.roster}];
 assert.deepEqual(engine.validateTranscript(account.draft_seed,transcript,'draft',account.rules_version,account.draft_fairness).roster,played.session.draft.roster);
 const result=await validateHandler(request('validate-run',{runId:account.run_id,runToken:token,transcript}));
 assert.equal(result.status,played.session.draft.done&&engine.calculateResult(played.session.draft.roster,account.rules_version).projectedWins===82?200:422,'Account replay must preserve the ranked 82-0 gate');
}
assert(finalizedRuns>=2);

// The exact reported aliases were legal under old display-name rules. Saved
// transcripts retain that behavior; new runs reject them before any finalizer
// or history mutation, even when the attacker submits the old valid transcript.
for(const [pool,oldVersion,draftSeed,picks]of [
 ['modern','atu-classic-v13','a2811cb1da55c2d86a1adb7322c10ba012e39da442ed9b561054e2d3f0b1be54',[['captain',3],['C',1293],['PF',747],['B1',285],['B2',611],['B3',288],['PG',783],['SF',752]]],
 ['history','atu-history-draft-v11','7c07f5c450b5aa94656c466fa104b8b00257a673db9c040eda919ff08b92630c',[['captain',76],['C',288],['PF',1120],['B1',1293],['B2',485],['B3',665],['PG',1221],['SF',964]]]
]){
 const events=picks.flatMap(([slot,cardId])=>slot==='captain'?[{type:'captain',cardId}]:[{type:'open',slot},{type:'pick',cardId}]);
 const old=engine.createClassicSession(draftSeed,events,oldVersion),transcript=[...events,{type:'arrange',roster:old.draft.roster}];
 const savedOld=row(++createdRuns,oldVersion,'owner','one_v_one');savedOld.draft_seed=draftSeed;runRows.set(savedOld.id,savedOld);
 const before=finalizedRuns,result=await validateHandler(request('validate-run',{runId:savedOld.id,runToken:token,transcript}));assert.equal(result.status,200);assert.equal(finalizedRuns,before+1);
 const current=row(++createdRuns,versions[pool],'owner','one_v_one');current.draft_seed=draftSeed;runRows.set(current.id,current);
 const rejected=await validateHandler(request('validate-run',{runId:current.id,runToken:token,transcript}));assert.equal(rejected.status,422);assert.equal(finalizedRuns,before+1,'Duplicate aliases must not reach finalization under new rules');
 current.mode='draft';current.draft_fairness={kind:'card-cycle-rarity-v1',releaseFractions:plain(currentReleaseFractions),shown:[]};journals.set(current.id,[]);activeRuns.set(scope('owner',pool),current.id);
 const beforeCalls=cycleCalls(),beforeHistory=plain(getCycle('owner',pool));
 await checkpoint({runId:current.id,runToken:token,events},400);
 assert.equal(cycleCalls(),beforeCalls);assert.deepEqual(getCycle('owner',pool),beforeHistory,'Forged duplicate alias transcript must not mutate cycle history');
}
console.log('Identity-cycle Edge handlers passed: immutable snapshots, unchanged Gold85%/Icon60% cycles, restart/history retention, old scalar and rarity replay, actual duplicate-alias rejection before checkpoint/finalization, auth/token/policy rejection and valid transcript acceptance (mocked database boundaries)');
