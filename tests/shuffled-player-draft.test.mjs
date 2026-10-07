import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
import * as engine from '../supabase/functions/_shared/atu-engine-shuffled-player-20261002.js';
import * as previous from '../supabase/functions/_shared/atu-engine-player-first-20261002.js';
import {CARDS as modern} from '../supabase/functions/_shared/ratings-20260920/modern-data.js';
import {CARDS as history} from '../supabase/functions/_shared/ratings-20260920/history-data.js';

const seed=i=>createHash('sha256').update('shuffled-player-regression-'+i).digest('hex');
const plain=x=>JSON.parse(JSON.stringify(x));
const highest=cards=>cards.reduce((a,b)=>b.ovr>a.ovr?b:a);
const rulesFactory=globalThis.ATUShuffledPlayerDraftRules;
const slots=['B1','B2','B3','C','PF','SF','SG','PG'];
const tiers=['Bronze','Silver','Gold','Elite','Icon'];
const fair={session:999,shown:{Variants:100000,'LeBron James':100000},last:{Variants:998},cards:{0:100000,222:100000}};
const snapshot=d=>plain({stage:d.stage,shuffleSeed:d.shuffleSeed,playerOrders:d.playerOrders,rngOffsets:d.rngOffsets,roster:d.roster,taken:d.taken,tierCounts:d.tierCounts,captain:d.captain.map(c=>c.id),opts:d.opts?.map(c=>c.id)??null,slotOpts:Object.fromEntries(Object.entries(d.slotOpts).map(([slot,cards])=>[slot,cards.map(c=>c.id)])),activeSlot:d.activeSlot,lastSlot:d.lastSlot,done:d.done});
assert.ok(rulesFactory?.create);
assert.equal(engine.CLASSIC_RULES_VERSION,'atu-classic-v11');
assert.equal(engine.rulesForPool('modern','draft'),'atu-classic-v11');
assert.equal(engine.rulesForPool('history','draft'),'atu-history-draft-v9');
for(const pool of ['modern','history'])assert.equal(engine.rulesForPool(pool,'pack'),previous.rulesForPool(pool,'pack'));
for(const version of ['atu-classic-v11','atu-history-draft-v9'])assert.throws(()=>engine.createClassicSession(undefined,[],version),/seed/i,'The server must never silently generate an unrecorded seed');

// Recorded from the frozen player-first router before this selector was added.
// Preserved run IDs must keep the same entire offer sequence and final roster.
for(const [version,expected] of [
 ['atu-classic-v10','ce7ba04aa79a5f1cba0c51d1507ac65301c37f83fe037ee878a712031edbdc27'],
 ['atu-history-draft-v8','374e6e1f99e2bb782d0b077e17581008aec6da4f095857c172acb028dc211d90']
]){
 const oldSeed='0123456789abcdef'.repeat(4),s=engine.createClassicSession(oldSeed,[],version),boards=[s.draft.captain.map(c=>c.id)],events=[];
 const apply=e=>{s.apply(e);events.push(e);};
 apply({type:'captain',cardId:s.draft.captain[0].id});
 for(const slot of engine.ALL_SLOTS)if(s.draft.roster[slot]==null){apply({type:'open',slot});boards.push(s.draft.opts.map(c=>c.id));apply({type:'pick',cardId:s.draft.opts[0].id});}
 assert.equal(createHash('sha256').update(JSON.stringify({boards,roster:s.draft.roster})).digest('hex'),expected,'Frozen replay changed: '+version);
 assert.deepEqual(s.draft,previous.createClassicSession(oldSeed,events,version).draft);
}
for(const version of previous.SUPPORTED_RULES_VERSIONS.filter(v=>previous.isClassicRulesVersion(v))){
 assert.deepEqual(engine.createClassicSession(seed('old'),[],version,fair).draft,previous.createClassicSession(seed('old'),[],version,fair).draft);
 assert.equal(engine.usesDraftHistory(version),previous.usesDraftHistory(version));
}

function fixture(){
 const cards=[];
 const add=(name,tier,positions=['PG','SG','SF','PF','C'],era='included')=>{const id=cards.length;cards.push({id,name,tier,pos:'SG',positions,ovr:80+id%15,team:'TEST',era});return id;};
 for(const tier of tiers){
  for(let i=0;i<12;i++)add(tier+' player '+i,tier,undefined,i===11?'excluded':'included');
  add(tier+' player 0',tier);add(tier+' player 0',tier,['PG','SF']);
 }
 return {cards,add};
}

// Reordering a database or the custom era-pool result must not alter a seeded
// draft. Also rebuild the rules factory for every action, as the UI does.
{
 const {cards}=fixture(),reversed=[...cards].reverse(),scrambled=[...cards].sort((a,b)=>(a.id*37%cards.length)-(b.id*37%cards.length));
 for(let i=0;i<40;i++){
  const draftSeed=seed('source-order-'+i);
  const factories=[cards,reversed,scrambled].map((db,index)=>()=>rulesFactory.create({cards:db,seed:draftSeed,pool:tier=>{
   const pool=db.filter(c=>c.tier===tier&&c.era==='included');return index===2?pool.reverse():pool;
  }}));
  let drafts=factories.map(make=>make().start());
  assert.deepEqual(drafts[0],drafts[1]);assert.deepEqual(drafts[0],drafts[2]);
  for(const tier of tiers){assert.equal(new Set(drafts[0].playerOrders[tier]).size,drafts[0].playerOrders[tier].length);assert(!drafts[0].playerOrders[tier].some(n=>n.endsWith('11')));}
  const apply=event=>{
   drafts=drafts.map(plain); // every action may follow a storage round-trip
   factories.forEach((make,index)=>make().apply(drafts[index],event));
   assert.deepEqual(drafts[0],drafts[1]);assert.deepEqual(drafts[0],drafts[2]);
  };
  apply({type:'captain',cardId:drafts[0].captain[0].id});
  for(const slot of slots)if(drafts[0].roster[slot]==null){apply({type:'open',slot});apply({type:'pick',cardId:drafts[0].opts[0].id});}
  assert(drafts.every(d=>d.done));
 }
}

// Test rarity boundaries with a controlled stream in an isolated VM; production
// randomness is never patched. This is independent of how the RNG is implemented.
const selectorSource=fs.readFileSync(new URL('../supabase/functions/_shared/shuffled-player-draft-20261002.js',import.meta.url),'utf8');
const isolated=vm.createContext({});
vm.runInContext(selectorSource,isolated);
isolated.ATUDraftRandomV1={create(_seed,{stream=0,offset=0}={}){
 let used=offset;
 const r=()=>{used++;return stream===1?isolated.rarityRoll:.1;};
 r.int=n=>Math.floor(r()*n);r.offset=()=>used;r.shuffle=items=>items.slice();return r;
}};
const tierCards=fixture().cards;
for(const [roll,expected] of [[0,'Bronze'],[.139999,'Bronze'],[.140001,'Silver'],[.539999,'Silver'],[.540001,'Gold'],[.939999,'Gold'],[.940001,'Elite'],[.979999,'Elite'],[.980001,'Icon'],[.999999,'Icon']]){
 isolated.rarityRoll=0;
 const rules=isolated.ATUShuffledPlayerDraftRules.create({cards:tierCards,seed:seed('boundaries')}),d=rules.start();
 rules.apply(d,{type:'captain',cardId:d.captain[0].id});isolated.rarityRoll=roll;rules.apply(d,{type:'open',slot:'PG'});
 assert.equal(d.opts[0].tier,expected,'Rarity boundary '+roll);
}
for(const [roll,expected] of [[0,'Icon'],[.499999,'Icon'],[.5,'Elite'],[.999999,'Elite']]){
 isolated.rarityRoll=roll;
 const d=isolated.ATUShuffledPlayerDraftRules.create({cards:tierCards,seed:seed('captain-boundary')}).start();
 assert.equal(d.captain[0].tier,expected);
}
for(const roll of [.95,.99]){
 isolated.rarityRoll=0;
 const rules=isolated.ATUShuffledPlayerDraftRules.create({cards:tierCards,seed:seed('cap')}),d=rules.start();
 rules.apply(d,{type:'captain',cardId:d.captain[0].id});d.tierCounts={Icon:2,Elite:4};isolated.rarityRoll=roll;rules.apply(d,{type:'open',slot:'PG'});
 assert(d.opts.every(c=>c.tier==='Gold'),'Reached Icon/Elite caps downgrade those rolls to Gold');
}

function assertUniform(counts,total,categories,label){
 assert.equal(counts.size,categories,label+' must reach every category');
 const expected=total/categories;
 const chiSquare=[...counts.values()].reduce((sum,n)=>sum+(n-expected)**2/expected,0);
 // Generous deterministic regression threshold: >6 sigma per category is a
 // meaningful concentration defect; the fixed seeded sample avoids flaky runs.
 for(const [name,count] of counts)assert(Math.abs(count-expected)<6*Math.sqrt(total/categories*(1-1/categories)),`${label}: ${name} ${count}/${total}`);
 assert(chiSquare<45,`${label}: chi-square ${chiSquare}`);
 return {minimum:Math.min(...counts.values()),maximum:Math.max(...counts.values()),chiSquare};
}
const increment=(m,key)=>m.set(key,(m.get(key)||0)+1);

// Eight eligible Gold players: one has three versions, seven have one.
// Icon captains are in a different position; PG has only Gold cards available.
// This tests an equal player chance, then an equal conditional version chance,
// without injecting the player stream or making assumptions about its algorithm.
{
 const cards=[];
 const add=(name,tier='Gold',positions=['PG'])=>{const id=cards.length;cards.push({id,name,tier,pos:positions[0],positions,ovr:86,team:'TEST'});return id;};
 const variantIds=[add('Variants'),add('Variants'),add('Variants')];
 for(let i=0;i<7;i++)add('Player '+i);
 const wrongPosition=add('Variants','Gold',['C']),wrongTier=add('Variants','Silver',['C']);
 for(let i=0;i<3;i++)add('Captain '+i,'Icon',['SG']);
 const names=new Map(),versions=new Map(),samples=80000;
 for(let i=0;i<samples;i++){
  const rules=rulesFactory.create({cards,seed:seed('fair-gold-'+i)}),d=rules.start();
  rules.apply(d,{type:'captain',cardId:d.captain[0].id});rules.apply(d,{type:'open',slot:'PG'});
  const c=d.opts[0];assert.equal(c.tier,'Gold');assert(c.positions.includes('PG'));assert(![wrongPosition,wrongTier].includes(c.id));
  increment(names,c.name);if(c.name==='Variants')increment(versions,c.id);
 }
 const playerStats=assertUniform(names,samples,8,'Gold players'),versionStats=assertUniform(versions,names.get('Variants'),variantIds.length,'Eligible versions');
 const captains=cards.slice(0,10).map(c=>({...c,tier:'Icon'})),captainNames=new Map(),captainVersions=new Map();
 for(let i=0;i<40000;i++){
  const c=rulesFactory.create({cards:captains,seed:seed('fair-captain-'+i)}).start().captain[0];
  increment(captainNames,c.name);if(c.name==='Variants')increment(captainVersions,c.id);
 }
 assertUniform(captainNames,40000,8,'Captain players');assertUniform(captainVersions,captainNames.get('Variants'),3,'Captain versions');
 console.log('Shuffled fairness, 80,000 Gold boards:',JSON.stringify({playerStats,versionStats}));
}

// Past offeredNames may be stored for compatibility, but changing that history
// must not change any draw. Fresh sessions also ignore supplied account history.
{
 const {cards}=fixture(),draftSeed=seed('ignored-history'),rules=rulesFactory.create({cards,seed:draftSeed}),d=rules.start();
 rules.apply(d,{type:'captain',cardId:d.captain[0].id});
 const clean=plain(d),saturated=plain(d);saturated.offeredNames=cards.map(c=>c.name);
 rulesFactory.create({cards,seed:draftSeed}).apply(clean,{type:'open',slot:'B1'});
 rulesFactory.create({cards,seed:draftSeed}).apply(saturated,{type:'open',slot:'B1'});
 assert.deepEqual(snapshot(clean),snapshot(saturated),'Prior offers must not suppress players');
 const before=plain(clean.rngOffsets),ids=clean.opts.map(c=>c.id);
 rulesFactory.create({cards,seed:draftSeed}).apply(clean,{type:'open',slot:'B1'});
 assert.deepEqual(clean.rngOffsets,before);assert.deepEqual(clean.opts.map(c=>c.id),ids,'Reopening a board must not advance or reroll');
}

// Use the actual browser DB/eraPool and actual localDraftRules wrapper. Calling
// that wrapper anew per action catches the local-factory RNG reset failure mode.
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const randomSource=fs.readFileSync(new URL('../supabase/functions/_shared/draft-random-20261002.js',import.meta.url),'utf8');
const localRulesSource=html.slice(html.indexOf('function localDraftRules(){'),html.indexOf('function applyDraftAction('));
const browser=vm.createContext({console});
vm.runInContext(randomSource+'\n'+selectorSource+'\n'+html.match(/<script>\s*\/\/<LOGIC>([\s\S]*?)\/\/<\/LOGIC>/)[1]+'\n'+localRulesSource,browser);
assert.match(html,/draft-random-20261002\.js/);assert.match(html,/shuffled-player-draft-20261002\.js/);
vm.runInContext('Math.random=()=>{throw new Error("Unexpected legacy random source")}',browser);
const localCards=vm.runInContext('DB.filter(p=>p.acquisitionActive)',browser);
let withinDraftUnpickedReoffers=0;
for(const [pool,cards,version] of [['modern',modern,'atu-classic-v11'],['history',history,'atu-history-draft-v9']]){
 assert.equal(engine.usesDraftHistory(version),false);
 assert.deepEqual(engine.createClassicSession(seed('history'),[],version,fair).draft,engine.createClassicSession(seed('history'),[],version,null).draft);
 assert.deepEqual([...localCards.filter(c=>pool==='history'||c.modernEligible).map(c=>c.id)].sort((a,b)=>a-b),cards.map(c=>c.id).sort((a,b)=>a-b));
 const byId=new Map(cards.map(c=>[c.id,c])),seen=new Set(),savedRuns=[];
 for(let i=0;i<2000;i++){
  const draftSeed=seed(pool+'-'+i),s=engine.createClassicSession(draftSeed,[],version),events=[],priorOffers=new Set();
  const observe=options=>{
   assert.equal(new Set(options.map(c=>c.name)).size,options.length,'One board must not repeat a player');
   for(const c of options){assert(byId.has(c.id));seen.add(c.id);if(priorOffers.has(c.name))withinDraftUnpickedReoffers++;priorOffers.add(c.name);}
  };
  observe(s.draft.captain);
  if(i<12){
   browser.testSeed=draftSeed;browser.testPool=pool;
   vm.runInContext('ROSTER_POOL=testPool;DRAFT_ERA=null;D={shuffledPlayerDraft:true,shuffleSeed:testSeed};D=localDraftRules().start();D.shuffledPlayerDraft=true',browser);
   assert.deepEqual(snapshot(s.draft),snapshot(vm.runInContext('D',browser)),'Browser/server captain parity');
  }
  const apply=e=>{
   s.apply(e);events.push(e);
   if(i<12){browser.nextEvent=e;vm.runInContext('localDraftRules().apply(D,nextEvent)',browser);assert.deepEqual(snapshot(s.draft),snapshot(vm.runInContext('D',browser)),'Browser/server action parity with new factory');}
  };
  apply({type:'captain',cardId:highest(s.draft.captain).id});
  for(const slot of slots)if(s.draft.roster[slot]==null){
   apply({type:'open',slot});assert.equal(s.draft.opts.length,5);observe(s.draft.opts);
   for(const c of s.draft.opts){
    assert(!s.draft.taken.some(id=>byId.get(id).n===c.name),'Already selected player returned');
    assert(slot.startsWith('B')||c.positions.includes(slot));assert.equal(c.tier,byId.get(c.id).r);
    if(['Elite','Icon'].includes(c.tier))assert((s.draft.tierCounts[c.tier]||0)<(c.tier==='Icon'?2:4));
   }
   if(i<12){
    const offsets=plain(s.draft.rngOffsets),ids=s.draft.opts.map(c=>c.id);
    s.apply({type:'open',slot});assert.deepEqual(s.draft.rngOffsets,offsets);assert.deepEqual(s.draft.opts.map(c=>c.id),ids);
   }
   apply({type:'pick',cardId:highest(s.draft.opts).id});
   if(s.draft.taken.length===7&&i<12){
    const saved={seed:draftSeed,events:plain(events),snapshot:snapshot(s.draft)};savedRuns.push(saved);
    assert.deepEqual(snapshot(engine.createClassicSession(draftSeed,saved.events,version).draft),saved.snapshot,'Seven-pick replay');
    vm.runInContext('D=JSON.parse(JSON.stringify(D))',browser);
    assert.deepEqual(snapshot(vm.runInContext('D',browser)),saved.snapshot,'Seven-pick local storage restore');
   }
  }
  assert(s.draft.done);assert.equal(new Set(s.draft.taken.map(id=>byId.get(id).n)).size,8);
  assert((s.draft.tierCounts.Icon||0)<=2);assert((s.draft.tierCounts.Elite||0)<=4);
  if(i<12){
   assert.deepEqual(engine.createClassicSession(draftSeed,events,version).draft,s.draft);
   assert.deepEqual(engine.validateTranscript(draftSeed,[...events,{type:'arrange',roster:s.draft.roster}],'draft',version).roster,s.draft.roster);
  }
 }
 assert.equal(seen.size,cards.length,`Unreachable ${pool} card IDs: ${cards.filter(c=>!seen.has(c.id)).map(c=>c.id)}`);
 const newRun=engine.createClassicSession(seed(pool+'-restart'),[],version,fair).draft;
 assert.equal(newRun.taken.length,0);assert.equal(newRun.stage,'captain');assert.notEqual(newRun.shuffleSeed,savedRuns[0].seed);
 assert.notDeepEqual(newRun.playerOrders,savedRuns[0].snapshot.playerOrders,'A fresh run independently reshuffles the players');
 for(const saved of savedRuns)assert.deepEqual(snapshot(engine.createClassicSession(saved.seed,saved.events,version,fair).draft),saved.snapshot,'Other runs must not change a saved draft');
 console.log(`${pool}: ${seen.size}/${cards.length} card versions reached; 2,000 complete drafts; twelve real-wrapper browser/server and seven-pick restore sequences passed`);
}
assert(withinDraftUnpickedReoffers>20,'Unpicked offers must remain eligible; no hidden repeat suppression');
console.log('Shuffled-player tests passed: source-order independence, rarity/caps, player/version fairness, fresh local factories, complete replay, old-version fingerprints and full pool reachability');

// Execute the real Edge handler bodies against mocked authentication/database
// boundaries. New client versions must be accepted, old clients must remain
// startable, and new-version results must reach the authenticated finalizer.
const edgeEnv={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server-only'};
const runToken='b'.repeat(64),runRows=new Map();
let createdRuns=0,historyRpcCalls=0,finalizedRuns=0,expectedRoster;
function edgeHandler(name){
 const raw=fs.readFileSync(new URL(`../supabase/functions/${name}/index.ts`,import.meta.url),'utf8');
 assert.match(raw,/atu-engine-card-cycle-identity-20261007\.js/,'Handler must import the current versioned router');
 const source=raw.replace(/import[\s\S]*?from "[^"]+";\r?\n/g,'');
 let handler;
 const context=vm.createContext({...engine,console,Response,Request,Headers,TextEncoder,crypto:webcrypto,
  draftExposure(){throw new Error('Shuffled/player-first drafts must not compute exposure history');},
  corsHeaders:{'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'},
  Deno:{env:{get:key=>edgeEnv[key]},serve:fn=>{handler=fn;}},
  createClient(_url,key){
   if(key==='anon')return {
    auth:{async getUser(value){return value==='valid-session'?{data:{user:{id:'owner'}}}:{data:{user:null},error:{message:'Invalid session'}};}},
    async rpc(rpc,args){
     assert.equal(rpc,'create_ranked_run');assert.equal(args.p_mode,'draft');
     const number=++createdRuns,id=`00000000-0000-4000-8000-${String(number).padStart(12,'0')}`,draftSeed=seed('handler-'+number);
     const row={id,user_id:'owner',mode:'draft',rules_version:args.p_rules_version,draft_seed:draftSeed,status:'started',expires_at:'2099-01-01',nonce_hash:createHash('sha256').update(runToken).digest('hex'),draft_fairness:null};
     runRows.set(id,row);
     return {data:[{run_id:id,run_token:runToken,draft_seed:draftSeed,rules_version:args.p_rules_version,expires_at:row.expires_at}]};
    }
   };
   return {
    from(table){assert.equal(table,'game_runs');let requested;return {select(){return this;},eq(field,value){assert.equal(field,'id');requested=value;return this;},async maybeSingle(){return {data:runRows.get(requested)};}};},
    async rpc(rpc,args){
     if(['initialize_draft_fairness','record_draft_exposure'].includes(rpc)){historyRpcCalls++;throw new Error('Unexpected exposure-history RPC');}
     assert.equal(rpc,'finalize_validated_run');assert.equal(args.p_run_token,runToken);assert.equal(args.p_user_id,'owner');
     assert.deepEqual(plain(args.p_roster),plain(expectedRoster));assert.match(args.p_result_digest,/^[a-f0-9]{64}$/);
     finalizedRuns++;return {data:[{outcome:'creator_completed',challenge_status:'open'}]};
    }
   };
  }
 });
 vm.runInContext(stripTypeScriptTypes(source),context);assert.equal(typeof handler,'function');return handler;
}
const request=(name,body,auth='valid-session')=>new Request(`https://example.supabase.co/functions/v1/${name}`,{method:'POST',headers:{origin:'https://www.packemultimateteam.com',authorization:'Bearer '+auth,'content-type':'application/json'},body:JSON.stringify(body)});
function play(draftSeed,version,limit){
 const session=engine.createClassicSession(draftSeed,[],version),events=[];
 const apply=e=>{session.apply(e);events.push(e);};
 apply({type:'captain',cardId:highest(session.draft.captain).id});
 for(const slot of slots)if(session.draft.roster[slot]==null&&session.draft.taken.length<limit){apply({type:'open',slot});apply({type:'pick',cardId:highest(session.draft.opts).id});}
 assert.equal(session.draft.taken.length,limit);return {session,events};
}
const historyHandler=edgeHandler('draft-history');
for(const [pool,version] of [['modern','atu-classic-v11'],['history','atu-history-draft-v9'],['modern','atu-classic-v10'],['history','atu-history-draft-v8']]){
 const start=await historyHandler(request('draft-history',{action:'start',pool,rulesVersion:version}));
 assert.equal(start.status,200);const first=(await start.json()).run;
 assert.equal(first.rules_version,version);assert.equal(first.draft_fairness,null);
 const {session,events}=play(first.draft_seed,version,7),saved={runId:first.run_id,runToken:first.run_token,events};
 const checkpoint=await historyHandler(request('draft-history',{action:'checkpoint',previous:saved}));assert.equal(checkpoint.status,200);
 const restart=await historyHandler(request('draft-history',{action:'start',pool,rulesVersion:engine.rulesForPool(pool,'draft'),previous:saved}));
 assert.equal(restart.status,200);const next=(await restart.json()).run;
 assert.equal(next.rules_version,engine.rulesForPool(pool,'draft'));assert.equal(next.draft_fairness,null);
 assert.notEqual(next.run_id,first.run_id);assert.notEqual(next.draft_seed,first.draft_seed,'Restart requires a new stored run seed');
 assert.deepEqual(engine.createClassicSession(first.draft_seed,events,version).draft,session.draft);
}
assert.equal(historyRpcCalls,0);
const beforeInvalid=createdRuns;
assert.equal((await historyHandler(request('draft-history',{action:'start',pool:'modern',rulesVersion:'atu-history-draft-v9'}))).status,400);
assert.equal(createdRuns,beforeInvalid,'Mismatched pool/version must not create a run');
assert.equal((await historyHandler(request('draft-history',{action:'start',pool:'modern',rulesVersion:'atu-classic-v11'},'invalid-session'))).status,401);
const validateHandler=edgeHandler('validate-run');
for(const pool of ['modern','history']){
 const version=engine.rulesForPool(pool,'draft');
 const start=await historyHandler(request('draft-history',{action:'start',pool,rulesVersion:version})),run=(await start.json()).run;
 const {session,events}=play(run.draft_seed,version,8);expectedRoster=session.draft.roster;
 // The duel route shares Classic transcript validation, without the separate
 // ranked perfect-roster reward gate obscuring acceptance of an ordinary run.
 runRows.get(run.run_id).mode='one_v_one';
 const body={runId:run.run_id,runToken:run.run_token,transcript:[...events,{type:'arrange',roster:session.draft.roster}]};
 const valid=await validateHandler(request('validate-run',body));assert.equal(valid.status,200);assert.equal((await valid.json()).ok,true);
 const count=finalizedRuns,forged=plain(body);forged.transcript[0].cardId=999999;
 assert.equal((await validateHandler(request('validate-run',forged))).status,422);assert.equal(finalizedRuns,count,'Forged transcript must never finalize');
}
assert.equal(finalizedRuns,2);assert.equal(historyRpcCalls,0);
console.log('Current Edge handlers passed: v11/history-v9 and v10/history-v8 starts, authenticated seven-pick restart, no exposure writes, new-version validation and forged-transcript rejection');
