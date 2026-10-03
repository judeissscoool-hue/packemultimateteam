import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
import * as engine from '../supabase/functions/_shared/atu-engine-player-first-20261002.js';
import * as previous from '../supabase/functions/_shared/atu-engine-uniform-20260928.js';
import {CARDS as modern} from '../supabase/functions/_shared/ratings-20260920/modern-data.js';
import {CARDS as history} from '../supabase/functions/_shared/ratings-20260920/history-data.js';

const seed=i=>createHash('sha256').update('player-first-regression-'+i).digest('hex');
const plain=value=>JSON.parse(JSON.stringify(value));
const highest=cards=>cards.reduce((a,b)=>b.ovr>a.ovr?b:a);
const fair={session:500,shown:{Variants:100000,'LeBron James':100000},last:{Variants:499,'LeBron James':499},cards:{0:100000,222:100000}};
const rulesFactory=globalThis.ATUPlayerFirstDraftRules;
assert.ok(rulesFactory?.create,'Player-first selector must load with the new router');
assert.equal(engine.rulesForPool('modern','draft'),'atu-classic-v10');
assert.equal(engine.rulesForPool('history','draft'),'atu-history-draft-v8');
assert.equal(engine.CLASSIC_RULES_VERSION,'atu-classic-v10');
for(const pool of ['modern','history'])assert.equal(engine.rulesForPool(pool,'pack'),previous.rulesForPool(pool,'pack'),'Pack rules must stay unchanged');

// These hashes were recorded from the deployed, frozen uniform engines before
// adding player-first rules. Catch accidental changes to persisted old drafts.
for(const [version,expected] of [
 ['atu-classic-v9','8b13fc57e6a751c599862e78fcf27d9aef266f73d8b54433a0b64d7b7bb7304b'],
 ['atu-history-draft-v7','75ba6b4e6097520d4400300a9f9b6bbc91de7b537f04f7e5316f5f4088d8e1b4']
]){
 const oldSeed='0123456789abcdef'.repeat(4),session=engine.createClassicSession(oldSeed,[],version),boards=[session.draft.captain.map(c=>c.id)],events=[];
 const apply=e=>{events.push(e);session.apply(e);};
 apply({type:'captain',cardId:session.draft.captain[0].id});
 for(const slot of engine.ALL_SLOTS)if(session.draft.roster[slot]==null){
  apply({type:'open',slot});boards.push(session.draft.opts.map(c=>c.id));apply({type:'pick',cardId:session.draft.opts[0].id});
 }
 assert.equal(createHash('sha256').update(JSON.stringify({boards,roster:session.draft.roster})).digest('hex'),expected,'Frozen replay changed: '+version);
 assert.deepEqual(session.draft,previous.createClassicSession(oldSeed,events,version).draft);
}
for(const version of previous.SUPPORTED_RULES_VERSIONS.filter(v=>previous.isClassicRulesVersion(v))){
 assert.deepEqual(engine.createClassicSession(seed('legacy'),[],version,structuredClone(fair)).draft,previous.createClassicSession(seed('legacy'),[],version,structuredClone(fair)).draft,'Legacy router changed: '+version);
}

function fixture(){
 const cards=[];
 const add=(name,tier='Gold',positions=['PG'],ovr=86)=>{const id=cards.length;cards.push({id,name,tier,positions,pos:positions[0],ovr,team:'TEST'});return id;};
 const variants=[add('Variants'),add('Variants'),add('Variants')];
 for(let i=0;i<7;i++)add('Player '+i);
 const wrongPosition=add('Variants','Gold',['C']);
 const wrongTier=add('Variants','Silver',['PG']);
 for(let i=0;i<6;i++)add('Captain '+i,'Icon',['SG'],99);
 return {cards,variants,wrongPosition,wrongTier};
}
let lcgState=19381;
const random=()=>((lcgState=(Math.imul(lcgState,1664525)+1013904223)>>>0)/4294967296);
const controlled=(cards)=>{
 let queued=[];
 const rules=rulesFactory.create({cards,random:()=>queued.length?queued.shift():random(),weights:{Variants:.000001},fair:structuredClone(fair)});
 const draft=rules.start();rules.apply(draft,{type:'captain',cardId:draft.captain[0].id});
 return {rules,draft,queue:values=>{queued=[...values];}};
};

// A player with three eligible versions gets one player ticket, like a player
// with one version; after that player wins, those three versions split it evenly.
const f=fixture(),firstCounts=new Map(),nameCounts=new Map();
const samples=40000;
for(let i=0;i<samples;i++){
 const {rules,draft,queue}=controlled(f.cards);
 queue([.7,random(),random()]); // first offer rolls Gold, then chooses player/version
 rules.apply(draft,{type:'open',slot:'PG'});
 const first=draft.opts[0];
 assert.equal(first.tier,'Gold');assert(first.positions.includes('PG'));
 assert(![f.wrongPosition,f.wrongTier].includes(first.id),'Choose versions only after filtering tier and position');
 firstCounts.set(first.id,(firstCounts.get(first.id)||0)+1);nameCounts.set(first.name,(nameCounts.get(first.name)||0)+1);
}
assert.equal(nameCounts.size,8);
for(const [name,count] of nameCounts)assert(Math.abs(count-samples/8)<300,`Player-first frequency skew: ${name}: ${count}`);
for(const id of f.variants)assert(Math.abs(firstCounts.get(id)-samples/24)<180,`Eligible versions should split a player's chance: ${id}`);
const captainCards=f.cards.slice(0,10).map(c=>({...c,tier:'Icon'})),captainNames=new Map(),captainIds=new Map();
for(let i=0;i<40000;i++){
 const card=rulesFactory.create({cards:captainCards,random}).start().captain[0];
 captainNames.set(card.name,(captainNames.get(card.name)||0)+1);captainIds.set(card.id,(captainIds.get(card.id)||0)+1);
}
for(const [name,count] of captainNames)assert(Math.abs(count-5000)<300,`Captain player-first frequency skew: ${name}`);
for(const id of f.variants)assert(Math.abs(captainIds.get(id)-40000/24)<180,`Captain version frequency skew: ${id}`);

// Rarity probabilities and captain anchor probabilities remain exactly the same.
const tierCards=[];
for(const tier of ['Bronze','Silver','Gold','Elite','Icon'])for(let i=0;i<8;i++){
 const id=tierCards.length;tierCards.push({id,name:tier+i,tier,pos:'SG',positions:['SG','PG'],ovr:80,team:'TEST'});
}
for(const [roll,expected] of [[0,'Bronze'],[.139999,'Bronze'],[.140001,'Silver'],[.539999,'Silver'],[.540001,'Gold'],[.939999,'Gold'],[.940001,'Elite'],[.979999,'Elite'],[.980001,'Icon'],[.999999,'Icon']]){
 const {rules,draft,queue}=controlled(tierCards);queue([roll,.1,.1]);rules.apply(draft,{type:'open',slot:'PG'});assert.equal(draft.opts[0].tier,expected,`Rarity boundary ${roll}`);
}
for(const [roll,expected] of [[0,'Icon'],[.499999,'Icon'],[.5,'Elite'],[.999999,'Elite']]){
 const queue=[roll,.1,.1],rules=rulesFactory.create({cards:tierCards,random:()=>queue.length?queue.shift():random()});assert.equal(rules.start().captain[0].tier,expected);
}
for(const roll of [.95,.99]){
 const {rules,draft,queue}=controlled(tierCards);draft.tierCounts={Icon:2,Elite:4};queue([roll,.1,.1]);rules.apply(draft,{type:'open',slot:'PG'});assert.equal(draft.opts[0].tier,'Gold','A capped high tier still downgrades to Gold');
 assert(draft.opts.every(c=>!['Icon','Elite'].includes(c.tier)));
}

// A passed-over player remains eligible immediately. Neither prior offers nor
// supplied cross-draft exposure history may act as a hidden blacklist.
{
 const {rules,draft,queue}=controlled(f.cards);
 draft.offeredNames=f.cards.map(c=>c.name);
 queue([.7,0,0]);rules.apply(draft,{type:'open',slot:'B1'});
 assert.equal(draft.opts[0].name,'Variants');
 const passedId=draft.opts[0].id,picked=draft.opts.find(c=>c.name!=='Variants');
 rules.apply(draft,{type:'pick',cardId:picked.id});
 queue([.7,0,0]);rules.apply(draft,{type:'open',slot:'B2'});
 assert.equal(draft.opts[0].id,passedId,'Unchosen exact card may return on the next board');
 assert(!draft.opts.some(c=>c.name===picked.name),'An already drafted player stays blocked');
}

// Run the browser-delivered selector with the actual browser DB and eraPool.
// The server's seed generator gives both runtimes the same random stream.
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const selector=fs.readFileSync(new URL('../supabase/functions/_shared/player-first-draft.js',import.meta.url),'utf8');
const seedSource=fs.readFileSync(new URL('../supabase/functions/_shared/uniform-20260928/modern-engine.js',import.meta.url),'utf8');
const rngSource=seedSource.slice(seedSource.indexOf('function hashSeed('),seedSource.indexOf('function tierRoll('));
const localRulesSource=html.slice(html.indexOf('function localDraftRules(){'),html.indexOf('function applyDraftAction('));
const browser=vm.createContext({console,assert:(ok,message)=>assert.ok(ok,message)});
vm.runInContext(selector+'\n'+rngSource+'\n'+html.match(/<script>\s*\/\/<LOGIC>([\s\S]*?)\/\/<\/LOGIC>/)[1]+'\n'+localRulesSource,browser);
assert.match(html,/player-first-draft\.js/,'The browser must load the player-first selector');
const localCards=vm.runInContext('DB.filter(p=>p.acquisitionActive)',browser);
const snapshot=d=>plain({stage:d.stage,roster:d.roster,taken:d.taken,tierCounts:d.tierCounts,captain:d.captain.map(c=>c.id),opts:d.opts?.map(c=>c.id)??null,slotOpts:Object.fromEntries(Object.entries(d.slotOpts).map(([slot,cards])=>[slot,cards.map(c=>c.id)])),activeSlot:d.activeSlot,done:d.done});

for(const [pool,cards,version] of [['modern',modern,'atu-classic-v10'],['history',history,'atu-history-draft-v8']]){
 assert.equal(engine.usesDraftHistory(version),false);
 assert.deepEqual(engine.createClassicSession(seed('history'),[],version,fair).draft,engine.createClassicSession(seed('history'),[],version,null).draft);
 assert.deepEqual([...localCards.filter(c=>pool==='history'||c.modernEligible).map(c=>c.id)].sort((a,b)=>a-b),cards.map(c=>c.id).sort((a,b)=>a-b),'Browser/server eligible card pool differs');
 const byId=new Map(cards.map(c=>[c.id,c])),seen=new Set(),sevenPickRuns=[];
 for(let i=0;i<2000;i++){
  const draftSeed=seed(pool+'-'+i),session=engine.createClassicSession(draftSeed,[],version),events=[];
  const observe=options=>{
   assert.equal(new Set(options.map(c=>c.name)).size,options.length,'No repeated name in one board');
   for(const c of options){assert(byId.has(c.id));seen.add(c.id);}
  };
  const apply=event=>{session.apply(event);events.push(event);};
  observe(session.draft.captain);
  if(i<10){
   browser.testSeed=draftSeed;browser.testPool=pool;
   vm.runInContext('ROSTER_POOL=testPool;DRAFT_ERA=null;D={playerFirstDraft:true};Math.random=seededRandom(testSeed);browserRules=localDraftRules();browserDraft=browserRules.start()',browser);
   assert.deepEqual(snapshot(session.draft),snapshot(browser.browserDraft),'Captain client/server parity');
  }
  const applyBoth=event=>{apply(event);if(i<10){browser.nextEvent=event;vm.runInContext('browserRules.apply(browserDraft,nextEvent)',browser);assert.deepEqual(snapshot(session.draft),snapshot(browser.browserDraft),'Action client/server parity');}};
  applyBoth({type:'captain',cardId:highest(session.draft.captain).id});
  for(const slot of ['B1','B2','B3','C','PF','SF','SG','PG'])if(session.draft.roster[slot]==null){
   applyBoth({type:'open',slot});assert.equal(session.draft.opts.length,5);observe(session.draft.opts);
   const ids=session.draft.opts.map(c=>c.id);
   for(const c of session.draft.opts){
    assert(!session.draft.taken.some(id=>byId.get(id).n===c.name),'Already drafted player was offered');
    assert(slot.startsWith('B')||c.positions.includes(slot));
    assert.equal(c.tier,byId.get(c.id).r);
    if(['Elite','Icon'].includes(c.tier))assert((session.draft.tierCounts[c.tier]||0)<(c.tier==='Icon'?2:4));
   }
   if(i===0){session.apply({type:'open',slot});assert.deepEqual(session.draft.opts.map(c=>c.id),ids,'Reopening the same board must not reroll it');}
   applyBoth({type:'pick',cardId:highest(session.draft.opts).id});
   if(session.draft.taken.length===7&&i<10){
    const saved=plain(events);sevenPickRuns.push({draftSeed,events:saved,snapshot:snapshot(session.draft)});
    assert.deepEqual(snapshot(engine.createClassicSession(draftSeed,saved,version).draft),snapshot(session.draft),'Seven-pick refresh must replay exactly');
   }
  }
  assert(session.draft.done);assert.equal(new Set(session.draft.taken.map(id=>byId.get(id).n)).size,8);
  assert((session.draft.tierCounts.Icon||0)<=2);assert((session.draft.tierCounts.Elite||0)<=4);
  if(i<10){
   assert.deepEqual(engine.createClassicSession(draftSeed,events,version).draft,session.draft);
   assert.deepEqual(engine.validateTranscript(draftSeed,[...events,{type:'arrange',roster:session.draft.roster}],'draft',version).roster,session.draft.roster);
  }
 }
 assert.equal(seen.size,cards.length,`All ${pool} cards, including every version, must remain reachable; missing IDs: ${cards.filter(c=>!seen.has(c.id)).map(c=>c.id)}`);
 const restart=engine.createClassicSession(seed(pool+'-fresh-restart'),[],version, fair).draft;
 assert.equal(restart.taken.length,0);assert.equal(restart.stage,'captain');
 assert.notDeepEqual(restart.captain.map(c=>c.id),engine.createClassicSession(sevenPickRuns[0].draftSeed,[],version).draft.captain.map(c=>c.id),'A fresh seed must create a fresh run');
 for(const saved of sevenPickRuns)assert.deepEqual(snapshot(engine.createClassicSession(saved.draftSeed,saved.events,version,fair).draft),saved.snapshot,'Starting other drafts must not change saved-run replay');
 console.log(`${pool}: ${seen.size}/${cards.length} versions reachable; 2,000 complete rosters and ten browser/server seven-pick replay sequences passed`);
}

// Exercise the actual Edge handlers with mocked auth/RPC boundaries. A handler
// accidentally retaining exposure initialization/writes must fail these tests.
const edgeEnv={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server-only'};
const token='a'.repeat(64),runRows=new Map();
let createdRuns=0,historyRpcCalls=0,finalizedRuns=0,expectedRoster;
function edgeHandler(name){
 const raw=fs.readFileSync(new URL(`../supabase/functions/${name}/index.ts`,import.meta.url),'utf8');
 assert.match(raw,/atu-engine-card-cycle-rarity-20261003\.js/,'Edge handler must load the current versioned router');
 const source=raw.replace(/import[\s\S]*?from "[^"]+";\r?\n/g,'');
 let handler;
 const context=vm.createContext({...engine,console,Response,Request,Headers,TextEncoder,crypto:webcrypto,
  draftExposure(){throw new Error('Player-first/uniform runs must not compute exposure history');},
  corsHeaders:{'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'},
  Deno:{env:{get:key=>edgeEnv[key]},serve:fn=>{handler=fn;}},
  createClient(_url,key){
   if(key==='anon')return {
    auth:{async getUser(value){return value==='valid-session'?{data:{user:{id:'owner'}}}:{data:{user:null},error:{message:'Invalid session'}};}},
    async rpc(rpc,args){
     assert.equal(rpc,'create_ranked_run');assert.equal(args.p_mode,'draft');
     const number=++createdRuns,id=`00000000-0000-4000-8000-${String(number).padStart(12,'0')}`,draftSeed=seed('handler-start-'+number);
     const row={id,user_id:'owner',mode:'draft',rules_version:args.p_rules_version,draft_seed:draftSeed,status:'started',expires_at:'2099-01-01',nonce_hash:createHash('sha256').update(token).digest('hex'),draft_fairness:null};
     runRows.set(id,row);
     return {data:[{run_id:id,run_token:token,draft_seed:draftSeed,rules_version:args.p_rules_version,expires_at:row.expires_at}]};
    }
   };
   return {
    from(table){assert.equal(table,'game_runs');let requested;return {select(){return this;},eq(field,value){assert.equal(field,'id');requested=value;return this;},async maybeSingle(){return {data:runRows.get(requested)};}};},
    async rpc(rpc,args){
     if(['initialize_draft_fairness','record_draft_exposure'].includes(rpc)){historyRpcCalls++;throw new Error('Unexpected draft exposure RPC');}
     assert.equal(rpc,'finalize_validated_run');assert.equal(args.p_run_token,token);assert.equal(args.p_user_id,'owner');assert.deepEqual(plain(args.p_roster),plain(expectedRoster));
     assert.match(args.p_result_digest,/^[a-f0-9]{64}$/);finalizedRuns++;return {data:[{outcome:'creator_completed',challenge_status:'open'}]};
    }
   };
  }
 });
 vm.runInContext(stripTypeScriptTypes(source),context);assert.equal(typeof handler,'function');return handler;
}
const historyHandler=edgeHandler('draft-history');
const request=(path,body,auth='valid-session')=>new Request(`https://example.supabase.co/functions/v1/${path}`,{method:'POST',headers:{origin:'https://www.packemultimateteam.com',authorization:'Bearer '+auth,'content-type':'application/json'},body:JSON.stringify(body)});
const play=(draftSeed,version,limit)=>{
 const session=engine.createClassicSession(draftSeed,[],version),events=[];
 const apply=e=>{session.apply(e);events.push(e);};
 apply({type:'captain',cardId:highest(session.draft.captain).id});
 for(const slot of ['B1','B2','B3','C','PF','SF','SG','PG'])if(session.draft.roster[slot]==null&&session.draft.taken.length<limit){apply({type:'open',slot});apply({type:'pick',cardId:highest(session.draft.opts).id});}
 assert.equal(session.draft.taken.length,limit);return {session,events};
};
for(const [pool,version] of [['modern','atu-classic-v10'],['history','atu-history-draft-v8'],['modern','atu-classic-v9'],['history','atu-history-draft-v7']]){
 const started=await historyHandler(request('draft-history',{action:'start',pool,rulesVersion:version}));
 assert.equal(started.status,200);const first=(await started.json()).run;
 assert.equal(first.rules_version,version);assert.equal(first.draft_fairness,null);
 const {session,events}=play(first.draft_seed,version,7),previousRun={runId:first.run_id,runToken:first.run_token,events};
 const checkpoint=await historyHandler(request('draft-history',{action:'checkpoint',previous:previousRun}));assert.equal(checkpoint.status,200);
 const restarted=await historyHandler(request('draft-history',{action:'start',pool,rulesVersion:engine.rulesForPool(pool,'draft'),previous:previousRun}));
 assert.equal(restarted.status,200);const next=(await restarted.json()).run;
 assert.equal(next.rules_version,engine.rulesForPool(pool,'draft'));assert.equal(next.draft_fairness,null);
 assert.notEqual(next.run_id,first.run_id);assert.notEqual(next.draft_seed,first.draft_seed,'Restart must return the replacement run seed');
 assert.deepEqual(engine.createClassicSession(first.draft_seed,events,version).draft,session.draft,'Restart must not change the previous seven-pick run');
}
assert.equal(historyRpcCalls,0,'Neither new player-first nor frozen uniform starts/checkpoints/restarts touch exposure history');
const beforeInvalid=createdRuns;
assert.equal((await historyHandler(request('draft-history',{action:'start',pool:'modern',rulesVersion:'atu-history-draft-v8'}))).status,400);
assert.equal(createdRuns,beforeInvalid,'Mismatched rules and pool must not create a run');
assert.equal((await historyHandler(request('draft-history',{action:'start',pool:'modern',rulesVersion:'atu-classic-v10'},'invalid-session'))).status,401);

const validateHandler=edgeHandler('validate-run');
for(const pool of ['modern','history']){
 const version=engine.rulesForPool(pool,'draft');
 const start=await historyHandler(request('draft-history',{action:'start',pool,rulesVersion:version})),run=(await start.json()).run;
 const {session,events}=play(run.draft_seed,version,8);expectedRoster=session.draft.roster;
 // one_v_one exercises the same transcript validator without requiring an
 // artificially perfect roster to pass the separate ranked 82-0 gate.
 runRows.get(run.run_id).mode='one_v_one';
 const body={runId:run.run_id,runToken:run.run_token,transcript:[...events,{type:'arrange',roster:session.draft.roster}]};
 const accepted=await validateHandler(request('validate-run',body));assert.equal(accepted.status,200);assert.equal((await accepted.json()).ok,true);
 const count=finalizedRuns,forged=structuredClone(body);forged.transcript[0].cardId=999999;
 assert.equal((await validateHandler(request('validate-run',forged))).status,422);assert.equal(finalizedRuns,count,'Forged player-first transcript must not finalize');
}
assert.equal(finalizedRuns,2);assert.equal(historyRpcCalls,0);
console.log('Player-first draws: player/version probabilities, eligibility, unchanged rarity/caps, history independence, frozen replay, browser/server parity, authenticated start/restart and validator acceptance passed');
