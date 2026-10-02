import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import * as engine from '../supabase/functions/_shared/atu-engine-card-cycle-20261002.js';
import * as previous from '../supabase/functions/_shared/atu-engine-shuffled-player-20261002.js';
import {CARDS as modern} from '../supabase/functions/_shared/ratings-20260920/modern-data.js';
import {CARDS as history} from '../supabase/functions/_shared/ratings-20260920/history-data.js';

const seed=value=>createHash('sha256').update('card-cycle-regression-'+value).digest('hex');
const plain=value=>JSON.parse(JSON.stringify(value));
const highest=cards=>cards.reduce((a,b)=>b.ovr>a.ovr?b:a);
const tiers=['Bronze','Silver','Gold','Elite','Icon'];
const slots=['B1','B2','B3','C','PF','SF','SG','PG'];
const policy=shown=>({kind:'card-cycle-v1',releaseFraction:.75,shown:[...shown]});
const factory=globalThis.ATUCardCycleDraftRules;
const snapshot=d=>plain({stage:d.stage,roster:d.roster,taken:d.taken,tierCounts:d.tierCounts,captain:d.captain.map(c=>c.id),opts:d.opts?.map(c=>c.id)??null,slotOpts:Object.fromEntries(Object.entries(d.slotOpts).map(([slot,cards])=>[slot,cards.map(c=>c.id)])),activeSlot:d.activeSlot,lastSlot:d.lastSlot,done:d.done,cardCycle:d.cardCycle});
assert.equal(engine.CLASSIC_RULES_VERSION,'atu-classic-v12');
assert.equal(engine.rulesForPool('history','draft'),'atu-history-draft-v10');
for(const pool of ['modern','history'])assert.equal(engine.rulesForPool(pool,'pack'),previous.rulesForPool(pool,'pack'));
for(const version of previous.SUPPORTED_RULES_VERSIONS){
 assert.equal(engine.getEngineForRules(version),previous.getEngineForRules(version),'Previous engine object changed');
 assert.equal(engine.usesDraftHistory(version),previous.usesDraftHistory(version));
 assert.equal(engine.usesCardCycleHistory(version),false);
}
// Captured from the frozen shuffled engines before adding card-cycle rules.
for(const [version,expected] of [
 ['atu-classic-v11','ab8ae9fa76ebdf9063f64aab0f5c4a37a5e261f29891feb0a8bf0960ed9b0932'],
 ['atu-history-draft-v9','f9d288b452f2c25bfa699f211853489da879a13f632a1c7628a079c90e50fe2c']
]){
 const draftSeed='0123456789abcdef'.repeat(4),session=engine.createClassicSession(draftSeed,[],version),boards=[session.draft.captain.map(c=>c.id)],events=[];
 const apply=e=>{session.apply(e);events.push(e);};
 apply({type:'captain',cardId:session.draft.captain[0].id});
 for(const slot of engine.ALL_SLOTS)if(session.draft.roster[slot]===null){apply({type:'open',slot});boards.push(session.draft.opts.map(c=>c.id));apply({type:'pick',cardId:session.draft.opts[0].id});}
 assert.equal(createHash('sha256').update(JSON.stringify({boards,roster:session.draft.roster})).digest('hex'),expected,'Frozen shuffled replay changed');
 assert.deepEqual(session.draft,previous.createClassicSession(draftSeed,events,version).draft);
}

function fixture(){
 const cards=[];
 const add=(name,tier='Gold',positions=['PG'],ovr=86)=>{const id=cards.length;cards.push({id,name,tier,pos:positions[0],positions,ovr,team:'TEST'});return id;};
 return {cards,add};
}
let lcg=19873;
const random=()=>((lcg=(Math.imul(lcg,1664525)+1013904223)>>>0)/4294967296);
function controlled(cards,shown=[]){
 let queued=[];
 const rng=()=>queued.length?queued.shift():random();
 const rules=factory.create({cards,random:rng,protection:{shown},releaseFraction:.75});
 const draft=rules.start();rules.apply(draft,{type:'captain',cardId:draft.captain[0].id});
 return {rules,draft,queue:values=>{queued=[...values];}};
}
const allTier=fixture();
for(const tier of tiers)for(let i=0;i<12;i++)allTier.add(tier+i,tier,['SG','PG']);
// Verify the rarity roll itself, independent of caps/positional retries.
for(const [roll,expected] of [[0,'Bronze'],[.139999,'Bronze'],[.140001,'Silver'],[.539999,'Silver'],[.540001,'Gold'],[.939999,'Gold'],[.940001,'Elite'],[.979999,'Elite'],[.980001,'Icon'],[.999999,'Icon']]){
 const {rules,draft,queue}=controlled(allTier.cards);queue([roll,.1]);rules.apply(draft,{type:'open',slot:'PG'});assert.equal(draft.opts[0].tier,expected);
}
for(const [roll,expected] of [[0,'Icon'],[.499999,'Icon'],[.5,'Elite'],[.999999,'Elite']]){
 const values=[roll,.1];const d=factory.create({cards:allTier.cards,random:()=>values.length?values.shift():random()}).start();assert.equal(d.captain[0].tier,expected);
}
for(const roll of [.95,.99]){
 const {rules,draft,queue}=controlled(allTier.cards);draft.tierCounts={Icon:2,Elite:4};queue(Array.from({length:10},(_,i)=>i%2?.1:roll));rules.apply(draft,{type:'open',slot:'PG'});assert(draft.opts.every(c=>c.tier==='Gold'));
}

// Equal eligible CARD chances: three versions carry three individual tickets.
{
 const f=fixture(),variants=[f.add('Variants'),f.add('Variants'),f.add('Variants')];
 for(let i=0;i<7;i++)f.add('Player '+i);
 const invalid=[f.add('Variants','Gold',['C']),f.add('Variants','Silver',['C'])];
 for(let i=0;i<6;i++)f.add('Captain '+i,'Icon',['SG']);
 const counts=new Map(),samples=30000;
 for(let i=0;i<samples;i++){
  const {rules,draft,queue}=controlled(f.cards);queue([.7,random()]);rules.apply(draft,{type:'open',slot:'PG'});
  const card=draft.opts[0];assert.equal(card.tier,'Gold');assert(card.positions.includes('PG'));assert(!invalid.includes(card.id));counts.set(card.id,(counts.get(card.id)||0)+1);
 }
 assert.equal(counts.size,10);
 for(const [id,count]of counts)assert(Math.abs(count-samples/10)<6*Math.sqrt(samples*.1*.9),`Unequal card chance: ${id}: ${count}`);
 const variantCount=variants.reduce((n,id)=>n+counts.get(id),0);assert(Math.abs(variantCount-samples*.3)<6*Math.sqrt(samples*.3*.7),'Multiple versions must remain separate card tickets');
}

// Offered exact IDs are protected. An unchosen player's DIFFERENT card remains
// eligible; selecting that player still blocks all versions in this squad.
{
 const f=fixture(),first=f.add('Variants'),second=f.add('Variants');for(let i=0;i<20;i++)f.add('Other '+i);
 for(let i=0;i<6;i++)f.add('Captain '+i,'Icon',['SG']);
 const {rules,draft,queue}=controlled(f.cards);draft.offeredNames=f.cards.map(c=>c.name);
 queue(Array.from({length:10},(_,i)=>i%2?0:.7));rules.apply(draft,{type:'open',slot:'B1'});assert.equal(draft.opts[0].id,first);
 rules.apply(draft,{type:'pick',cardId:draft.opts.find(c=>c.name!=='Variants').id});
 queue(Array.from({length:10},(_,i)=>i%2?0:.7));rules.apply(draft,{type:'open',slot:'B2'});assert.equal(draft.opts[0].id,second);assert(!draft.opts.some(c=>c.id===first));
 rules.apply(draft,{type:'pick',cardId:second});
 queue(Array.from({length:10},(_,i)=>i%2?0:.7));rules.apply(draft,{type:'open',slot:'B3'});assert(!draft.opts.some(c=>c.name==='Variants'));
}

// Reset at ceil(75% of the rarity pool), before the following draw. A scarce
// position releases only its oldest eligible exact ID without changing rarity.
{
 const f=fixture();for(let i=0;i<20;i++)f.add('Gold '+i);for(let i=0;i<6;i++)f.add('Captain '+i,'Icon',['SG']);
 const {rules,draft,queue}=controlled(f.cards,Array.from({length:14},(_,i)=>i));queue(Array.from({length:10},(_,i)=>i%2?0:.7));rules.apply(draft,{type:'open',slot:'PG'});
 const journal=draft.cardCycle.events.filter(e=>e.tier==='Gold');assert.deepEqual(journal.slice(0,3),[{type:'offer',tier:'Gold',cardId:14},{type:'reset',tier:'Gold'},{type:'offer',tier:'Gold',cardId:0}]);
 const narrow=fixture();for(let i=0;i<20;i++)narrow.add('Gold '+i,'Gold',[i<2?'PG':'C']);for(let i=0;i<6;i++)narrow.add('Captain '+i,'Icon',['SG']);
 const constrained=controlled(narrow.cards,[1,0]);constrained.queue(Array.from({length:1000},(_,i)=>i%2?0:.7));constrained.rules.apply(constrained.draft,{type:'open',slot:'PG'});
 assert.deepEqual(constrained.draft.cardCycle.events.filter(e=>e.tier==='Gold').slice(0,4),[{type:'release',cardId:1,tier:'Gold'},{type:'offer',cardId:1,tier:'Gold'},{type:'release',cardId:0,tier:'Gold'},{type:'offer',cardId:0,tier:'Gold'}]);
 assert(constrained.draft.opts.every(c=>c.tier==='Gold'));
}

function verifyJournal(fairness,draft,cards){
 const byId=new Map(cards.map(c=>[c.id,c])),state=Object.fromEntries(tiers.map(t=>[t,fairness.shown.filter(id=>byId.get(id).r===t)]));
 for(const event of draft.cardCycle.events){
  assert(tiers.includes(event.tier));const ids=state[event.tier],threshold=Math.ceil(cards.filter(c=>c.r===event.tier).length*fairness.releaseFraction);
  if(event.type==='reset'){assert(ids.length>=threshold,'Premature rarity reset');state[event.tier]=[];}
  else if(event.type==='release'){assert(ids.length<threshold);assert(ids.includes(event.cardId));ids.splice(ids.indexOf(event.cardId),1);}
  else{assert.equal(event.type,'offer');assert.equal(byId.get(event.cardId).r,event.tier);assert(!ids.includes(event.cardId),'A protected exact ID returned without reset/release');ids.push(event.cardId);}
 }
 assert.deepEqual(draft.cardCycle.shown,state);
 assert.deepEqual(draft.cardCycle.events.filter(e=>e.type==='offer').map(e=>e.cardId),[...draft.captain,...Object.values(draft.slotOpts).flat()].map(c=>c.id),'Every genuinely revealed card must be journaled once');
}

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const randomSource=fs.readFileSync(new URL('../supabase/functions/_shared/draft-random-20261002.js',import.meta.url),'utf8');
const selectorSource=fs.readFileSync(new URL('../supabase/functions/_shared/card-cycle-draft-20261002.js',import.meta.url),'utf8');
const localRulesSource=html.slice(html.indexOf('function localDraftRules(){'),html.indexOf('function applyDraftAction('));
const stored=new Map(),browser=vm.createContext({console,crypto:webcrypto,sSet:(key,value)=>stored.set(key,plain(value))});
vm.runInContext(randomSource+'\n'+selectorSource+'\n'+html.match(/<script>\s*\/\/<LOGIC>([\s\S]*?)\/\/<\/LOGIC>/)[1]+'\n'+localRulesSource,browser);
vm.runInContext('Math.random=()=>{throw new Error("Legacy random source used")}',browser);
assert.match(html,/card-cycle-draft-20261002\.js/);assert.match(localRulesSource,/cycleOffset/);
const localCards=vm.runInContext('DB.filter(p=>p.acquisitionActive)',browser);
for(const [pool,cards,version]of [['modern',modern,'atu-classic-v12'],['history',history,'atu-history-draft-v10']]){
 const specific=engine.getEngineForRules(version);assert(engine.usesDraftHistory(version)&&engine.usesCardCycleHistory(version));
 for(const invalidSeed of [undefined,'123',seed(1).toUpperCase()])assert.throws(()=>engine.createClassicSession(invalidSeed,[],version),/seed/i);
 const validId=cards[0].id;
 for(const invalid of [{},[],{...policy([]),kind:'wrong'},{...policy([]),releaseFraction:0},{...policy([]),releaseFraction:1.01},{...policy([]),releaseFraction:NaN},{...policy([]),releaseFraction:'0.75'},{...policy([]),shown:'bad'},policy([999999]),policy([validId,validId]),policy([1.2]),policy(Array(cards.length+1).fill(validId))])assert.throws(()=>specific.cloneCardCycleFairness(invalid));
 assert.equal(specific.cloneCardCycleFairness({...policy([]),releaseFraction:1}).releaseFraction,1);
 assert.deepEqual(plain(specific.cloneCardCycleFairness(null)),policy([]));
 assert.deepEqual([...localCards.filter(c=>pool==='history'||c.modernEligible).map(c=>c.id)].sort((a,b)=>a-b),cards.map(c=>c.id).sort((a,b)=>a-b));
 const byId=new Map(cards.map(c=>[c.id,c])),seen=new Set(),saved=[];let fairness=policy([]),resetCount=0,releaseCount=0;
 for(let i=0;i<2000;i++){
  const draftSeed=seed(pool+'-'+i),before=plain(fairness),session=engine.createClassicSession(draftSeed,[],version,fairness),events=[];
  assert(Object.isFrozen(session.fairness)&&Object.isFrozen(session.fairness.shown));assert.notEqual(session.fairness.shown,fairness.shown);
  const observe=options=>{assert.equal(new Set(options.map(c=>c.name)).size,options.length);for(const c of options){assert(byId.has(c.id));seen.add(c.id);}};
  observe(session.draft.captain);
  if(i<12){
   browser.testPool=pool;browser.testSeed=draftSeed;browser.testFair=plain(fairness);
   vm.runInContext('ROSTER_POOL=testPool;DRAFT_ERA=null;if(!DRAFT_CARD_CYCLES[localCardCycleKey()])DRAFT_CARD_CYCLES[localCardCycleKey()]=[]',browser);
   assert.deepEqual(plain(vm.runInContext('DRAFT_CARD_CYCLES[localCardCycleKey()]',browser)),fairness.shown,'Restart must retain prior local protection');
   vm.runInContext('D={cardPool:ROSTER_POOL,cardCycleDraft:true,cycleSeed:testSeed};D={...localDraftRules().start(),cardPool:ROSTER_POOL,cardCycleDraft:true,cycleSeed:testSeed};persistCardCycle()',browser);
   assert.deepEqual(snapshot(vm.runInContext('D',browser)),snapshot(session.draft));
  }
  const apply=event=>{
   session.apply(event);events.push(event);
   if(i<12){browser.event=event;vm.runInContext('D=JSON.parse(JSON.stringify(D));localDraftRules().apply(D,event);persistCardCycle()',browser);assert.deepEqual(snapshot(vm.runInContext('D',browser)),snapshot(session.draft),'Actual local factory/serialized restore differs from server replay');}
  };
  apply({type:'captain',cardId:highest(session.draft.captain).id});
  for(const slot of slots)if(session.draft.roster[slot]===null){
   apply({type:'open',slot});assert.equal(session.draft.opts.length,5);observe(session.draft.opts);
   for(const c of session.draft.opts){assert(slot.startsWith('B')||c.positions.includes(slot));assert(!session.draft.taken.some(id=>byId.get(id).n===c.name));if(['Elite','Icon'].includes(c.tier))assert((session.draft.tierCounts[c.tier]||0)<(c.tier==='Icon'?2:4));}
   if(i<12){const previous=snapshot(session.draft),offset=vm.runInContext('D.cycleOffset',browser);apply({type:'open',slot});assert.deepEqual(snapshot(session.draft),previous);assert.equal(vm.runInContext('D.cycleOffset',browser),offset,'Cached board must not consume RNG');}
   apply({type:'pick',cardId:highest(session.draft.opts).id});
   if(i<12&&session.draft.taken.length===7){
    const checkpoint={seed:draftSeed,events:plain(events),fairness:plain(fairness),state:snapshot(session.draft)};saved.push(checkpoint);
    assert.deepEqual(snapshot(engine.createClassicSession(draftSeed,events,version,fairness).draft),checkpoint.state,'Seven-pick refresh must retain cycle and offers');
    const restart=engine.createClassicSession(seed(pool+'-seven-restart-'+i),[],version,policy(Object.values(session.draft.cardCycle.shown).flat()));assert.equal(restart.draft.taken.length,0);assert.equal(restart.draft.stage,'captain');
   }
  }
  assert(session.draft.done);assert.equal(new Set(session.draft.taken.map(id=>byId.get(id).n)).size,8);
  assert((session.draft.tierCounts.Icon||0)<=2&&(session.draft.tierCounts.Elite||0)<=4);
  verifyJournal(fairness,session.draft,cards);assert.deepEqual(fairness,before,'Replay modified its immutable initial snapshot');
  resetCount+=session.draft.cardCycle.events.filter(e=>e.type==='reset').length;releaseCount+=session.draft.cardCycle.events.filter(e=>e.type==='release').length;
  if(i<12){
   const transcript=[...events,{type:'arrange',roster:session.draft.roster}];assert.deepEqual(engine.validateTranscript(draftSeed,transcript,'draft',version,fairness).roster,session.draft.roster);
   const forged=plain(transcript);forged[0].cardId=999999;assert.throws(()=>engine.validateTranscript(draftSeed,forged,'draft',version,fairness));
   assert.deepEqual(stored.get('atu-card-cycle-v1')[pool+'|all'],Object.values(session.draft.cardCycle.shown).flat());
  }
  fairness=policy(Object.values(session.draft.cardCycle.shown).flat());
 }
 assert.equal(seen.size,cards.length,`Unreachable ${pool} IDs: ${cards.filter(c=>!seen.has(c.id)).map(c=>c.id)}`);assert(resetCount>20);assert(releaseCount>0,'Exercise scarce-position release in the real pool');
 for(const checkpoint of saved)assert.deepEqual(snapshot(engine.createClassicSession(checkpoint.seed,checkpoint.events,version,checkpoint.fairness).draft),checkpoint.state,'Later cycles changed earlier run replay');
 console.log(`${pool}: ${seen.size}/${cards.length} versions reached across 2,000 complete protected drafts; ${resetCount} resets, ${releaseCount} narrow releases; real local wrapper restart/restore and validator checks passed`);
}
assert(stored.get('atu-card-cycle-v1')['modern|all']&&stored.get('atu-card-cycle-v1')['history|all'],'Pool histories must coexist independently');
console.log('Card-cycle tests passed: exact-card probability, unchanged rarity/caps, 75% reset, oldest eligible release, frozen old replay, immutable snapshots, local persistence and complete pool coverage');
