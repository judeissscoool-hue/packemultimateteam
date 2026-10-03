import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import * as engine from '../supabase/functions/_shared/atu-engine-card-cycle-rarity-20261003.js';
import * as previous from '../supabase/functions/_shared/atu-engine-card-cycle-20261002.js';
import {CARDS as modern} from '../supabase/functions/_shared/ratings-20260920/modern-data.js';
import {CARDS as history} from '../supabase/functions/_shared/ratings-20260920/history-data.js';

const tiers=['Bronze','Silver','Gold','Elite','Icon'],slots=['B1','B2','B3','C','PF','SF','SG','PG'];
const fractions={Bronze:.85,Silver:.85,Gold:.85,Elite:.85,Icon:.6};
const policy=shown=>({kind:'card-cycle-rarity-v1',releaseFractions:{...fractions},shown:[...shown]});
const seed=value=>createHash('sha256').update('rarity-cycle-regression-'+value).digest('hex');
const plain=value=>JSON.parse(JSON.stringify(value));
const highest=cards=>cards.reduce((a,b)=>b.ovr>a.ovr?b:a);
const snapshot=d=>plain({stage:d.stage,roster:d.roster,taken:d.taken,tierCounts:d.tierCounts,captain:d.captain.map(c=>c.id),opts:d.opts?.map(c=>c.id)??null,slotOpts:Object.fromEntries(Object.entries(d.slotOpts).map(([slot,cards])=>[slot,cards.map(c=>c.id)])),activeSlot:d.activeSlot,lastSlot:d.lastSlot,done:d.done,cardCycle:d.cardCycle});
assert.equal(engine.ENGINE_VERSION,'atu-card-cycle-rarity-v1');
assert.equal(engine.CLASSIC_RULES_VERSION,'atu-classic-v13');
assert.equal(engine.rulesForPool('history','draft'),'atu-history-draft-v11');
for(const pool of ['modern','history'])assert.equal(engine.rulesForPool(pool,'pack'),previous.rulesForPool(pool,'pack'));
for(const version of previous.SUPPORTED_RULES_VERSIONS){
 assert.equal(engine.getEngineForRules(version),previous.getEngineForRules(version));
 assert.equal(engine.usesDraftHistory(version),previous.usesDraftHistory(version));
 assert.equal(engine.usesCardCycleHistory(version),previous.usesCardCycleHistory(version));
 assert.equal(engine.usesRarityCardCycleHistory(version),false);
}

// Fingerprints captured from the scalar engines before adding the rarity policy.
// An 80%-full snapshot makes 75% and 90% genuinely different replay scenarios.
for(const [version,cards,expected75,expected90]of [
 ['atu-classic-v12',modern,'69f9dc2bc783dd1d528fb753a7f8a04d77e48cdde8ca0480be32adb2367b3971','49e00c318680d0b718feb1670a46a933e60310859e7aa0c011109f841ea77b34'],
 ['atu-history-draft-v10',history,'c46422e979e022b035ea8735ab2f9bbe85cc82c8a61dacd32bfba2a204edcd37','88ed8cb42f1ba4dd47ee5d5cae1a9b112d96a5b6abd5380c98dc5e931e5bcefb']
])for(const [releaseFraction,expected]of [[.75,expected75],[.9,expected90]]){
 const shown=tiers.flatMap(tier=>{const pool=cards.filter(c=>c.r===tier);return pool.slice(0,Math.ceil(pool.length*.8)).map(c=>c.id);});
 const fairness={kind:'card-cycle-v1',releaseFraction,shown},draftSeed='0123456789abcdef'.repeat(4),session=engine.createClassicSession(draftSeed,[],version,fairness),events=[];
 const boards=[session.draft.captain.map(c=>c.id)],apply=event=>{session.apply(event);events.push(event);};
 apply({type:'captain',cardId:session.draft.captain[0].id});
 for(const slot of engine.ALL_SLOTS)if(session.draft.roster[slot]===null){apply({type:'open',slot});boards.push(session.draft.opts.map(c=>c.id));apply({type:'pick',cardId:session.draft.opts[0].id});}
 assert.equal(createHash('sha256').update(JSON.stringify({boards,roster:session.draft.roster,events:session.draft.cardCycle.events})).digest('hex'),expected,'Frozen scalar '+version+' '+releaseFraction);
 assert.deepEqual(session.draft,previous.createClassicSession(draftSeed,events,version,fairness).draft);
}

function verifyJournal(fairness,draft,cards){
 const byId=new Map(cards.map(c=>[c.id,c])),state=Object.fromEntries(tiers.map(tier=>[tier,fairness.shown.filter(id=>byId.get(id).r===tier)]));
 for(const event of draft.cardCycle.events){
  assert(tiers.includes(event.tier));const ids=state[event.tier],threshold=Math.ceil(cards.filter(c=>c.r===event.tier).length*fairness.releaseFractions[event.tier]);
  if(event.type==='reset'){assert(ids.length>=threshold,'Premature '+event.tier+' reset');state[event.tier]=[];}
  else if(event.type==='release'){assert(ids.length<threshold);assert(ids.includes(event.cardId));ids.splice(ids.indexOf(event.cardId),1);}
  else{assert.equal(event.type,'offer');assert.equal(byId.get(event.cardId).r,event.tier);assert(!ids.includes(event.cardId),'Protected exact card reappeared without release/reset');ids.push(event.cardId);}
 }
 assert.deepEqual(draft.cardCycle.shown,state);
 assert.deepEqual(draft.cardCycle.events.filter(e=>e.type==='offer').map(e=>e.cardId),[...draft.captain,...Object.values(draft.slotOpts).flat()].map(c=>c.id),'Journal exactly the revealed offers');
}

// Execute the actual guest start and action wrapper, with storage and render
// supplied by the harness. JSON restore occurs between every UI action.
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const localRulesSource=html.slice(html.indexOf('function localDraftRules(){'),html.indexOf('function applyDraftAction('));
const localStartSource=html.slice(html.indexOf('let startingNormalRun=false;'),html.indexOf('function pickCaptain('));
const stored=new Map(),browser=vm.createContext({console,crypto:webcrypto,sSet:(key,value)=>stored.set(key,plain(value)),ATUBackend:{isSignedIn:()=>false},render:()=>{}});
vm.runInContext(read('../supabase/functions/_shared/draft-random-20261002.js')+'\n'+read('../supabase/functions/_shared/card-cycle-draft-20261002.js')+'\n'+read('../supabase/functions/_shared/card-cycle-rarity-draft-20261003.js')+'\n'+html.match(/<script>\s*\/\/<LOGIC>([\s\S]*?)\/\/<\/LOGIC>/)[1]+'\n'+localRulesSource+'\n'+localStartSource,browser);
vm.runInContext('Math.random=()=>{throw new Error("Legacy random source used")}',browser);
assert.deepEqual(plain(vm.runInContext('DRAFT_CARD_RELEASE_FRACTIONS',browser)),fractions);

for(const [pool,cards,version]of [['modern',modern,'atu-classic-v13'],['history',history,'atu-history-draft-v11']]){
 const specific=engine.getEngineForRules(version);assert(engine.usesRarityCardCycleHistory(version));assert(engine.usesCardCycleHistory(version));
 for(const invalidSeed of [undefined,'123',seed(1).toUpperCase()])assert.throws(()=>engine.createClassicSession(invalidSeed,[],version),/seed/i);
 const validId=cards[0].id;
 const invalidPolicies=[{},[],{...policy([]),kind:'card-cycle-v1'},... [null,{},[],.85,{...fractions,Icon:0},{...fractions,Gold:1.01},{...fractions,Gold:NaN},{...fractions,Gold:'0.85'},{...fractions,Unknown:.5}].map(releaseFractions=>({...policy([]),releaseFractions})),{...policy([]),shown:'bad'},policy([999999]),policy([validId,validId]),policy([1.2])];
 for(const invalid of invalidPolicies)assert.throws(()=>specific.cloneCardCycleFairness(invalid));
 assert.deepEqual(plain(specific.cloneCardCycleFairness(null)),policy([]));
 const mutable=policy([validId]),cloned=specific.cloneCardCycleFairness(mutable);mutable.releaseFractions.Icon=.1;mutable.shown.length=0;
 assert.equal(cloned.releaseFractions.Icon,.6);assert.deepEqual(cloned.shown,[validId]);
 const byId=new Map(cards.map(c=>[c.id,c])),seen=new Set(),saved=[];let resets=0,releases=0;
 // Retain history from an earlier scalar policy; no clearing on first new start.
 let fairness=policy(tiers.flatMap(tier=>cards.filter(c=>c.r===tier).slice(0,2).map(c=>c.id)));
 browser.testPool=pool;browser.testShown=plain(fairness.shown);
 vm.runInContext('ROSTER_POOL=testPool;DRAFT_ERA=null;DRAFT_CARD_CYCLES[localCardCycleKey()]=[...testShown]',browser);
 for(let i=0;i<1500;i++){
  const before=plain(fairness);let draftSeed=seed(pool+'-'+i);
  if(i<12){
   assert.deepEqual(plain(vm.runInContext('DRAFT_CARD_CYCLES[localCardCycleKey()]',browser)),fairness.shown,'Actual new start must keep existing shared history');
   await vm.runInContext('startDraft(null)',browser);draftSeed=vm.runInContext('D.cycleSeed',browser);
   assert.equal(vm.runInContext('D.rarityCardCycleDraft',browser),true);assert.deepEqual(plain(vm.runInContext('D.cycleReleaseFractions',browser)),fractions);
  }
  const session=engine.createClassicSession(draftSeed,[],version,fairness),events=[];
  assert(Object.isFrozen(session.fairness)&&Object.isFrozen(session.fairness.shown)&&Object.isFrozen(session.fairness.releaseFractions));
  if(i<12)assert.deepEqual(snapshot(vm.runInContext('D',browser)),snapshot(session.draft),'Actual local captain start must match server');
  const observe=options=>{assert.equal(new Set(options.map(c=>c.name)).size,options.length);for(const c of options){assert(byId.has(c.id));seen.add(c.id);}};observe(session.draft.captain);
  const apply=event=>{
   session.apply(event);events.push(event);
   if(i<12){browser.event=event;vm.runInContext('D=JSON.parse(JSON.stringify(D));localDraftRules().apply(D,event);persistCardCycle()',browser);assert.deepEqual(snapshot(vm.runInContext('D',browser)),snapshot(session.draft),'Serialized local action must match engine');assert.deepEqual(plain(vm.runInContext('D.cycleReleaseFractions',browser)),fractions);}
  };
  apply({type:'captain',cardId:highest(session.draft.captain).id});
  for(const slot of slots)if(session.draft.roster[slot]===null){
   apply({type:'open',slot});assert.equal(session.draft.opts.length,5);observe(session.draft.opts);
   for(const c of session.draft.opts){assert(slot.startsWith('B')||c.positions.includes(slot));assert(!session.draft.taken.some(id=>byId.get(id).n===c.name));if(['Elite','Icon'].includes(c.tier))assert((session.draft.tierCounts[c.tier]||0)<(c.tier==='Icon'?2:4));}
   if(i<12){const beforeOpen=snapshot(session.draft),offset=vm.runInContext('D.cycleOffset',browser);apply({type:'open',slot});assert.deepEqual(snapshot(session.draft),beforeOpen);assert.equal(vm.runInContext('D.cycleOffset',browser),offset,'Cached board must not advance RNG');}
   apply({type:'pick',cardId:highest(session.draft.opts).id});
   if(i<12&&session.draft.taken.length===7){saved.push({seed:draftSeed,events:plain(events),fairness:plain(fairness),state:snapshot(session.draft)});assert.deepEqual(snapshot(engine.createClassicSession(draftSeed,events,version,fairness).draft),snapshot(session.draft));}
  }
  assert(session.draft.done);assert.equal(new Set(session.draft.taken.map(id=>byId.get(id).n)).size,8);assert((session.draft.tierCounts.Icon||0)<=2&&(session.draft.tierCounts.Elite||0)<=4);
  verifyJournal(fairness,session.draft,cards);assert.deepEqual(fairness,before,'Immutable initial snapshot must survive the entire run');
  resets+=session.draft.cardCycle.events.filter(e=>e.type==='reset').length;releases+=session.draft.cardCycle.events.filter(e=>e.type==='release').length;
  if(i<12){
   const transcript=[...events,{type:'arrange',roster:session.draft.roster}];assert.deepEqual(engine.validateTranscript(draftSeed,transcript,'draft',version,fairness).roster,session.draft.roster);
   const forged=plain(transcript);forged[0].cardId=999999;assert.throws(()=>engine.validateTranscript(draftSeed,forged,'draft',version,fairness));
   assert.deepEqual(stored.get('atu-card-cycle-v1')[pool+'|all'],Object.values(session.draft.cardCycle.shown).flat(),'Keep the original storage key and exact-card history');
  }
  fairness=policy(Object.values(session.draft.cardCycle.shown).flat());
 }
 assert.equal(seen.size,cards.length,`Unreachable ${pool} cards: ${cards.filter(c=>!seen.has(c.id)).map(c=>c.id)}`);assert(resets>20);assert(releases>0);
 for(const savedRun of saved)assert.deepEqual(snapshot(engine.createClassicSession(savedRun.seed,savedRun.events,version,savedRun.fairness).draft),savedRun.state,'Later cycles must not change an earlier seven-pick snapshot');
 console.log(`${pool}: all ${seen.size} exact cards reached in 1,500 complete 60%/85% drafts, ${resets} resets, ${releases} position releases; actual guest starts and serialized action replay matched`);
}
assert(stored.get('atu-card-cycle-v1')['modern|all']&&stored.get('atu-card-cycle-v1')['history|all'],'Pool histories must remain separate');
console.log('Rarity-cycle engine tests passed: frozen scalar75/90 replay, version routing, validated immutable maps, unchanged caps, full card reachability, retained shared history, actual guest starts, JSON restoration and trusted transcript validation');
