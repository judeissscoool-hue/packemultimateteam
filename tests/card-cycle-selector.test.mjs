import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import '../supabase/functions/_shared/draft-random-20261002.js';
import '../supabase/functions/_shared/card-cycle-draft-20261002.js';

const factory=globalThis.ATUCardCycleDraftRules;
const tiers=['Bronze','Silver','Gold','Elite','Icon'];
const seed=i=>createHash('sha256').update('card-cycle-selector-'+i).digest('hex');
const plain=value=>JSON.parse(JSON.stringify(value));
function fixture(goldCount=30,pgCount=goldCount){
 const cards=[];
 for(let i=0;i<goldCount;i++)cards.push({id:i,name:'Gold '+i,tier:'Gold',pos:i<pgCount?'PG':'C',positions:i<pgCount?['PG']:['C'],ovr:86});
 for(let i=0;i<12;i++)cards.push({id:100+i,name:'Icon '+i,tier:'Icon',pos:'SG',positions:['SG'],ovr:99});
 for(let i=0;i<20;i++)cards.push({id:200+i,name:'Silver '+i,tier:'Silver',pos:'PG',positions:['PG'],ovr:75});
 return cards;
}
function controlled(cards,shown=[],roll=.7){
 const random=()=>roll;random.int=()=>0;
 const protection={kind:'card-cycle-v1',releaseFraction:.75,shown:[...shown]};
 const rules=factory.create({cards,random,protection}),draft=rules.start();
 rules.apply(draft,{type:'captain',cardId:draft.captain[0].id});
 return {rules,draft,protection};
}
const open=(state,slot='PG')=>{state.rules.apply(state.draft,{type:'open',slot});return state.draft.opts;};

// Exact card IDs get equal tickets. Three versions of a name receive three
// tickets; this explicitly detects accidentally retaining player-first draws.
{
 const cards=fixture(10);for(const card of cards.slice(0,3))card.name='Three versions';
 const source=globalThis.ATUDraftRandomV1.create(seed('uniform'));
 const random=()=>.7;random.int=bound=>source.int(bound);
 const counts=new Map(),samples=30000;
 for(let i=0;i<samples;i++){
  const rules=factory.create({cards,random}),draft=rules.start();
  rules.apply(draft,{type:'captain',cardId:draft.captain[0].id});rules.apply(draft,{type:'open',slot:'PG'});
  const first=draft.opts[0];counts.set(first.id,(counts.get(first.id)||0)+1);
  assert.equal(first.tier,'Gold');assert.equal(new Set(draft.opts.map(card=>card.name)).size,5);
 }
 assert.equal(counts.size,10);
 for(const [id,count]of counts)assert(Math.abs(count-samples/10)<250,`Exact card ${id} did not receive an equal ticket: ${count}`);
 const multiVersionCount=[0,1,2].reduce((sum,id)=>sum+counts.get(id),0);
 assert(Math.abs(multiVersionCount-samples*.3)<500,'A multi-version name must retain its per-card probability');
 const protectedFirst=controlled(cards,[0]);assert.equal(open(protectedFirst)[0].id,1,'Protection excludes only the offered version, not all versions of its name');
}

// Every revealed card enters protection, regardless of whether it is picked.
// Reopening a board and selecting/swapping never records its offers twice.
{
 const state=controlled(fixture());open(state);const shown=state.draft.opts.map(card=>card.id);
 assert.deepEqual(shown,[0,1,2,3,4]);assert.deepEqual(state.draft.cardCycle.shown.Gold,shown);
 const before=plain(state.draft.cardCycle);state.rules.apply(state.draft,{type:'open',slot:'PG'});
 assert.deepEqual(state.draft.cardCycle,before);
 state.rules.apply(state.draft,{type:'pick',cardId:shown[0]});assert.deepEqual(state.draft.cardCycle,before);
 const next=open(state,'B1');assert(next.every(card=>!shown.includes(card.id)),'Unchosen offers must also be protected');
 const snapshot=tiers.flatMap(tier=>state.draft.cardCycle.shown[tier]);
 const restarted=controlled(fixture(),snapshot),restartOffers=open(restarted);
 assert(restartOffers.every(card=>!state.draft.cardCycle.shown.Gold.includes(card.id)),'Protection must survive a restarted draft snapshot');
 assert.deepEqual(state.protection.shown,[],'Do not mutate the supplied immutable snapshot');
}

// The boundary is ceil(75% of the rarity's entire pool), not 75% of its position
// subset or of all rarities combined. Reset immediately before the next offer.
{
 const state=controlled(fixture(20),[...Array(14).keys(),200,201,202]);
 const captainEvents=state.draft.cardCycle.events.length;open(state);
 const events=state.draft.cardCycle.events.slice(captainEvents);
 assert.deepEqual(events.slice(0,3),[{type:'offer',cardId:14,tier:'Gold'},{type:'reset',tier:'Gold'},{type:'offer',cardId:0,tier:'Gold'}]);
 assert.deepEqual(state.draft.cardCycle.shown.Silver,[200,201,202],'A Gold reset must retain Silver protection');
 assert.deepEqual(state.draft.cardCycle.shown.Gold,[0,1,2,3]);
 const alreadyAtBoundary=controlled(fixture(12),[...Array(9).keys()]);
 const begin=alreadyAtBoundary.draft.cardCycle.events.length;assert.equal(open(alreadyAtBoundary)[0].id,0);
 assert.deepEqual(alreadyAtBoundary.draft.cardCycle.events[begin],{type:'reset',tier:'Gold'});
}

// Current 90% protection applies independently to every rarity, with ceiling
// rounding for non-integral thresholds. Keep the saved/default 75% tests above.
// Captains come from the other high rarity so their offers cannot consume the
// boundary being measured; every target card is position-eligible.
for(const count of [20,21])for(const [tierIndex,tier]of tiers.entries()){
 const cards=tiers.flatMap((rarity,index)=>Array.from({length:count},(_,i)=>({id:index*100+i,name:rarity+i,tier:rarity,pos:'SG',positions:['SG','PG'],ovr:80})));
 const targetIds=cards.filter(card=>card.tier===tier).map(card=>card.id),threshold=Math.ceil(count*.9);
 const roll={Bronze:.1,Silver:.3,Gold:.7,Elite:.95,Icon:.99}[tier];
 const random=()=>roll;random.int=bound=>bound===2&&tier==='Icon'?1:0;
 const otherTier=tiers[(tierIndex+1)%tiers.length],otherId=cards.find(card=>card.tier===otherTier).id;
 for(const shownCount of [threshold-1,threshold]){
  const protection={kind:'card-cycle-v1',releaseFraction:.9,shown:[...targetIds.slice(0,shownCount),otherId]};
  const original=plain(protection),rules=factory.create({cards,random,protection,releaseFraction:.9}),draft=rules.start();
  rules.apply(draft,{type:'captain',cardId:draft.captain[0].id});
  const before=plain(draft.cardCycle.shown),begin=draft.cardCycle.events.length;
  rules.apply(draft,{type:'open',slot:'PG'});
  const events=draft.cardCycle.events.slice(begin),label=`${tier} ${shownCount}/${count} at 90%`;
  const expected=shownCount===threshold
   ?[{type:'reset',tier},{type:'offer',cardId:targetIds[0],tier}]
   :[{type:'offer',cardId:targetIds[shownCount],tier},{type:'reset',tier},{type:'offer',cardId:targetIds[0],tier}];
  assert.deepEqual(events.slice(0,expected.length),expected,label);
  assert.equal(events.filter(event=>event.type==='reset').length,1,label+' must reset exactly once');
  assert(!events.some(event=>event.type==='release'),label+' has enough eligible cards without a scarcity release');
  assert(draft.opts.every(card=>card.tier===tier),label+' must retain its rolled rarity');
  assert.equal(new Set(draft.opts.map(card=>card.id)).size,5,label+' must not duplicate a card within the board');
  for(const other of tiers.filter(value=>value!==tier))assert.deepEqual(draft.cardCycle.shown[other],before[other],label+' must preserve '+other+' protection');
  assert.deepEqual(protection,original,label+' must preserve its immutable input');
 }
}

// Scarce positions release only the oldest protected usable card per necessary
// offer. Selected/board names stay excluded; unrelated IDs remain protected.
{
 const state=controlled(fixture(20,5),[4,3,2,1,0,10]);
 const begin=state.draft.cardCycle.events.length;
 const options=open(state);assert.deepEqual(options.map(card=>card.id),[4,3,2,1,0]);
 const events=state.draft.cardCycle.events.slice(begin);
 assert.deepEqual(events.filter(event=>event.type==='release').map(event=>event.cardId),[4,3,2,1,0]);
 assert(!events.some(event=>event.type==='reset'),'Position scarcity must not reset the entire rarity');
 assert(state.draft.cardCycle.shown.Gold.includes(10),'Unrelated position must remain protected');
 assert(options.every(card=>card.tier==='Gold'),'Protection must not alter a rolled rarity');
 const withFresh=controlled(fixture(20,6),[0,1,2,3,4,10]);
 const freshBegin=withFresh.draft.cardCycle.events.length;assert.deepEqual(open(withFresh).map(card=>card.id),[5,0,1,2,3]);
 assert.equal(withFresh.draft.cardCycle.events.slice(freshBegin).filter(event=>event.type==='release').length,4,'Use every available fresh card before releasing protected ones');
}

// Canonical per-card ordering makes browser/server source order irrelevant.
// A new browser action factory must continue the cycle carried by draft state.
{
 const cards=fixture(),randomA=globalThis.ATUDraftRandomV1.create(seed('order')),randomB=globalThis.ATUDraftRandomV1.create(seed('order'));
 const rulesA=factory.create({cards,random:randomA,protection:{shown:[4,2,0]}});
 const rulesB=factory.create({cards:[...cards].reverse(),random:randomB,protection:{shown:[4,2,0]}});
 const a=rulesA.start(),b=rulesB.start();assert.deepEqual(a,b);
 const captain={type:'captain',cardId:a.captain[0].id};rulesA.apply(a,captain);rulesB.apply(b,captain);
 for(const slot of ['B1','B2','B3','PG']){
  const action={type:'open',slot};rulesA.apply(a,action);
  factory.create({cards:[...cards].reverse(),random:randomB,protection:{shown:[]}}).apply(b,action);
  assert.deepEqual(a,b,'A fresh action factory must use draft cycle state, not rebuild it from the input snapshot');
  const pick={type:'pick',cardId:a.opts[0].id};rulesA.apply(a,pick);rulesB.apply(b,pick);assert.deepEqual(a,b);
 }
}

// The rarity thresholds and roster cap downgrades are unchanged. Synthetic
// abundant pools isolate these rolls from exhausted-era fallback behavior.
{
 const cards=[];
 for(const tier of tiers)for(let i=0;i<20;i++){const id=cards.length;cards.push({id,name:tier+i,tier,pos:'SG',positions:['SG','PG'],ovr:80});}
 for(const [roll,tier]of [[0,'Bronze'],[.139999,'Bronze'],[.140001,'Silver'],[.539999,'Silver'],[.540001,'Gold'],[.939999,'Gold'],[.940001,'Elite'],[.979999,'Elite'],[.980001,'Icon'],[.999999,'Icon']]){
  assert.equal(open(controlled(cards,[],roll))[0].tier,tier,'Rarity boundary '+roll);
 }
 for(const roll of [.95,.99]){
  const state=controlled(cards,[],roll);state.draft.tierCounts={Icon:2,Elite:4};
  assert(open(state).every(card=>card.tier==='Gold'),'Capped high tiers must still downgrade to Gold');
 }
 const state=controlled(cards),selectedName=state.draft.captain[0].name;
 assert(open(state,'B1').every(card=>card.name!==selectedName),'Already drafted names remain excluded');
}

// Ignore valid retired/foreign IDs and duplicate IDs, while rejecting malformed
// history rather than letting it change replay unpredictably.
{
 const state=controlled(fixture(),[2,2,99999,1]);assert.deepEqual(state.draft.cardCycle.shown.Gold,[2,1]);
 assert(!JSON.stringify(state.draft).includes('playerOrders'),'No per-restart player shuffle survives in cycle state');
 const missing=factory.create({cards:fixture(),pool:tier=>tier==='Gold'?fixture().filter(card=>card.tier==='Gold'):[],random:()=>.7});
 assert.equal(missing.start().captain.length,3,'Captain era fallback still works');
 for(const protection of [null,[],{}, {shown:'0'}, {shown:[-1]}, {shown:[1.5]}, {shown:['1']}])assert.throws(()=>factory.create({cards:fixture(),protection}).start(),/Invalid/);
 for(const releaseFraction of [0,-1,1.1,NaN,'0.75'])assert.throws(()=>factory.create({cards:fixture(),releaseFraction}),/Invalid card cycle release fraction/);
}
console.log('Card cycle selector: exact-card probabilities, version-specific protection, restart snapshots, all-five-rarity 90% boundaries/rounding, saved 75% compatibility, scarce positions, unchanged odds/caps and action-factory continuity passed');
