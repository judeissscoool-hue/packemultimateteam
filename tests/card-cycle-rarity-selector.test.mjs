import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import '../supabase/functions/_shared/draft-random-20261002.js';
import '../supabase/functions/_shared/card-cycle-rarity-draft-20261003.js';

const factory=globalThis.ATUCardCycleRarityDraftRules;
const tiers=['Bronze','Silver','Gold','Elite','Icon'];
const fractions={Bronze:.85,Silver:.85,Gold:.85,Elite:.85,Icon:.6};
const rolls={Bronze:.1,Silver:.3,Gold:.7,Elite:.95,Icon:.99};
const plain=value=>JSON.parse(JSON.stringify(value));
function fixture(count=21){
 return tiers.flatMap((tier,index)=>Array.from({length:count},(_,i)=>({id:index*100+i,name:tier+i,tier,pos:'SG',positions:['SG','PG'],ovr:80})));
}
function controlled(cards,{tier='Gold',shown=[],releaseFractions=fractions,roll=rolls[tier]}={}){
 const random=()=>roll;random.int=bound=>bound===2&&tier==='Icon'?1:0;
 const rules=factory.create({cards,random,protection:{shown},releaseFractions}),draft=rules.start();
 rules.apply(draft,{type:'captain',cardId:draft.captain[0].id});return {rules,draft};
}
const open=(state,slot='PG')=>{state.rules.apply(state.draft,{type:'open',slot});return state.draft.opts;};

// Captains use the other high rarity, leaving the measured target untouched.
// Check both sides of every threshold, including ceiling rounding (21 cards).
for(const count of [20,21])for(const [index,tier]of tiers.entries()){
 const cards=fixture(count),ids=cards.filter(c=>c.tier===tier).map(c=>c.id),threshold=Math.ceil(count*fractions[tier]);
 const foreign=cards.find(c=>c.tier===tiers[(index+1)%tiers.length]).id;
 for(const shownCount of [threshold-1,threshold]){
  const shown=[...ids.slice(0,shownCount),foreign],beforeInput=[...shown],state=controlled(cards,{tier,shown});
  const before=plain(state.draft.cardCycle.shown),begin=state.draft.cardCycle.events.length;open(state);
  const events=state.draft.cardCycle.events.slice(begin),label=`${tier}: ${shownCount}/${count}, ${fractions[tier]*100}%`;
  const expected=shownCount===threshold
   ?[{type:'reset',tier},{type:'offer',cardId:ids[0],tier}]
   :[{type:'offer',cardId:ids[shownCount],tier},{type:'reset',tier},{type:'offer',cardId:ids[0],tier}];
  assert.deepEqual(events.slice(0,expected.length),expected,label);
  assert.equal(events.filter(e=>e.type==='reset').length,1,label+' resets once');
  assert(!events.some(e=>e.type==='release'),label+' requires no position fallback');
  assert(state.draft.opts.every(c=>c.tier===tier),label+' retains the rarity draw');
  assert.equal(new Set(state.draft.opts.map(c=>c.name)).size,5,label+' keeps unique board names');
  for(const other of tiers.filter(t=>t!==tier))assert.deepEqual(state.draft.cardCycle.shown[other],before[other],label+' preserves '+other);
  assert.deepEqual(shown,beforeInput,'No mutation of supplied history');
 }
}

// At 60%, Icon cycles may reopen while lower-tier protection remains active.
// An inherited cycle between the old and new thresholds is used as-is, rather
// than being erased when the policy changes.
{
 const cards=fixture(20),shown=[...Array.from({length:12},(_,i)=>400+i),...Array.from({length:14},(_,i)=>200+i)];
 const icon=controlled(cards,{tier:'Icon',shown}),begin=icon.draft.cardCycle.events.length;open(icon);
 assert.deepEqual(icon.draft.cardCycle.events[begin],{type:'reset',tier:'Icon'});
 assert.deepEqual(icon.draft.cardCycle.shown.Gold,shown.filter(id=>id<400),'The Icon reset must not discard inherited Gold history');
 const gold=controlled(cards,{tier:'Gold',shown}),goldBegin=gold.draft.cardCycle.events.length;open(gold);
 assert.deepEqual(gold.draft.cardCycle.events[goldBegin],{type:'offer',cardId:214,tier:'Gold'},'Gold must continue past 60% without resetting');
}

// Scarcity preserves the rolled rarity and releases the oldest eligible exact
// IDs, not an entire tier. The policy must not silently narrow the denominator.
{
 const cards=fixture(20);for(const c of cards.filter(c=>c.tier==='Gold'&&c.id>=205))c.positions=['SG','C'];
 const state=controlled(cards,{shown:[204,203,202,201,200,210]}),begin=state.draft.cardCycle.events.length;
 assert.deepEqual(open(state).map(c=>c.id),[204,203,202,201,200]);
 const events=state.draft.cardCycle.events.slice(begin);
 assert.deepEqual(events.filter(e=>e.type==='release').map(e=>e.cardId),[204,203,202,201,200]);
 assert(!events.some(e=>e.type==='reset'));assert(state.draft.cardCycle.shown.Gold.includes(210));
}

// Rarity probabilities and selected-roster caps are independent of protection.
{
 const cards=fixture(30);
 for(const [roll,tier]of [[0,'Bronze'],[.139999,'Bronze'],[.140001,'Silver'],[.539999,'Silver'],[.540001,'Gold'],[.939999,'Gold'],[.940001,'Elite'],[.979999,'Elite'],[.980001,'Icon'],[.999999,'Icon']]){
  assert(open(controlled(cards,{roll})).every(c=>c.tier===tier),'Rarity boundary '+roll);
 }
 for(const roll of [.95,.99]){
  const state=controlled(cards,{roll});state.draft.tierCounts={Icon:2,Elite:4};
  assert(open(state).every(c=>c.tier==='Gold'),'Existing Icon/Elite caps still downgrade to Gold');
 }
 for(const [roll,tier]of [[0,'Icon'],[.499999,'Icon'],[.5,'Elite'],[.999999,'Elite']]){
  const values=[roll,0];let state=123;
  const random=()=>values.length?values.shift():((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  assert.equal(factory.create({cards,random}).start().captain[0].tier,tier,'Captain odds '+roll);
 }
}

// Equal-card selection still grants three separate tickets to three versions.
// This also detects accidentally restoring player-first or shuffled selection.
{
 const cards=fixture(30).filter(c=>c.tier!=='Gold'||c.id<210);for(const c of cards.filter(c=>c.tier==='Gold'&&c.id<203))c.name='Three versions';
 const source=globalThis.ATUDraftRandomV1.create(createHash('sha256').update('rarity-cycle-card-fairness').digest('hex'));
 const random=()=>.7;random.int=n=>source.int(n);const counts=new Map(),samples=20000;
 for(let i=0;i<samples;i++){
  const rules=factory.create({cards,random}),draft=rules.start();rules.apply(draft,{type:'captain',cardId:draft.captain[0].id});rules.apply(draft,{type:'open',slot:'PG'});
  const id=draft.opts[0].id;counts.set(id,(counts.get(id)||0)+1);
 }
 assert.equal(counts.size,10);for(const count of counts.values())assert(Math.abs(count-samples/10)<6*Math.sqrt(samples*.1*.9),'Each exact card gets the same chance');
 assert(Math.abs([200,201,202].reduce((n,id)=>n+counts.get(id),0)-samples*.3)<6*Math.sqrt(samples*.3*.7));
 assert.equal(open(controlled(cards,{shown:[200]}))[0].id,201,'A different unselected version stays eligible');
}

// A factory keeps its supplied policy even if the caller later changes the map.
// Reject incomplete, extra-key or malformed maps instead of guessing defaults.
{
 const cards=fixture(20),policy={...fractions},state=controlled(cards,{shown:Array.from({length:14},(_,i)=>200+i),releaseFractions:policy});
 policy.Gold=.1;const begin=state.draft.cardCycle.events.length;open(state);
 assert.deepEqual(state.draft.cardCycle.events[begin],{type:'offer',cardId:214,tier:'Gold'});
 for(const releaseFractions of [null,[],{},.85,{...fractions,Icon:0},{...fractions,Gold:1.01},{...fractions,Gold:NaN},{...fractions,Gold:'0.85'},{...fractions,Unknown:.5},Object.fromEntries(Object.entries(fractions).filter(([tier])=>tier!=='Silver'))]){
  assert.throws(()=>factory.create({cards,releaseFractions}),/Invalid/i);
 }
}
console.log('Rarity-cycle selector passed: all five 60%/85% boundaries and rounding, independent retained history, scarcity, unchanged rarity/captain odds/caps, exact-card fairness and immutable validated policy');
