import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import '../supabase/functions/_shared/draft-random-20261002.js';
import '../supabase/functions/_shared/player-identity-20261007.js';
import '../supabase/functions/_shared/card-cycle-identity-draft-20261007.js';
import {CARDS} from '../supabase/functions/_shared/ratings-20260920/history-data.js';

const factory=globalThis.ATUCardCycleIdentityDraftRules,key=globalThis.ATUPlayerIdentityV1.key;
const tiers=['Bronze','Silver','Gold','Elite','Icon'],fractions={Bronze:.85,Silver:.85,Gold:.85,Elite:.85,Icon:.6};
const byId=new Map(CARDS.map(c=>[c.id,c]));
const publicCard=id=>{const c=byId.get(id);return {id:c.id,name:c.n,tier:c.r,pos:c.p,positions:c.ps,ovr:c.o};};
const plain=value=>JSON.parse(JSON.stringify(value));
assert.equal(key('Robert Williams'),'Robert Williams III');assert.equal(key({name:'Robert Williams'}),key({n:'Robert Williams III'}));
assert.equal(key('KJ Martin'),'Kenyon Martin Jr.');assert.equal(key({name:'KJ Martin'}),key({n:'Kenyon Martin Jr.'}));
for(const group of [[288,742,1293],[605,755]])assert.equal(new Set(group.map(id=>key(byId.get(id)))).size,1,'Known aliases must share identity');
// Explicit mapping must not strip suffixes, approximate spellings or surnames.
for(const [a,b]of [[47,213],[106,418],[148,687],[948,454],[156,755],[41,255],[114,1257],[354,506],[692,779],[362,386],[11,842]]){
 if(byId.has(a)&&byId.has(b))assert.notEqual(key(byId.get(a)),key(byId.get(b)),`Distinct players ${a}/${b} must remain distinct`);
}
for(const c of CARDS)if(!['Robert Williams','KJ Martin'].includes(c.n))assert.equal(key(c),c.n,'Do not silently normalize unaudited names');

function fixture(){
 const cards=[288,742,1293,605,755,156].map(publicCard);
 for(const [index,tier]of tiers.entries())for(let i=0;i<24;i++)cards.push({id:2000+index*100+i,name:tier+' filler '+i,tier,pos:'SG',positions:['SG','PG','SF','PF','C'],ovr:80});
 return cards;
}
function controlled(tier='Gold',shown=[],cards=fixture()){
 const random=()=>({Bronze:.1,Silver:.3,Gold:.7,Elite:.95,Icon:.99})[tier];random.int=()=>0;
 const rules=factory.create({cards,random,protection:{shown},releaseFractions:fractions}),draft=rules.start();
 rules.apply(draft,{type:'captain',cardId:draft.captain[0].id});return {rules,draft,cards};
}
const open=(s,slot='B1')=>{s.rules.apply(s.draft,{type:'open',slot});return s.draft.opts;};

// All directions include Boston old-name, Boston suffix and Portland versions.
// Seed a valid already-picked state, then exercise both offer filtering and the
// final pick guard against a tampered/stale board that contains the alias.
for(const [selected,alias]of [[288,1293],[1293,288],[288,742],[742,288],[742,1293],[1293,742],[605,755],[755,605]]){
 const card=publicCard(selected),target=publicCard(alias),state=controlled(target.tier);
 state.draft.taken.push(selected);state.draft.roster.B1=selected;state.draft.tierCounts[card.tier]=(state.draft.tierCounts[card.tier]||0)+1;
 const offers=open(state,'B2');assert(offers.every(c=>key(c)!==key(card)),`Selected ${selected} must block alias ${alias}`);
 state.draft.opts=[target];state.draft.slotOpts.B2=[target];
 assert.throws(()=>state.rules.apply(state.draft,{type:'pick',cardId:alias}),/already drafted|identity/i,'Stale/forged alias board must not bypass pick validation');
 assert(!state.draft.taken.includes(alias));
}

// Same-board identity uniqueness and cross-draft exact-card protection are
// separate rules. Passing over one variant protects only that card ID.
for(const [tier,first,other,aliases]of [['Gold',288,1293,[288,1293]],['Silver',605,755,[605,755]]]){
 const cards=fixture().filter(c=>!((c.id===156&&tier==='Gold')||(c.id===742&&tier==='Silver'))),state=controlled(tier,[],cards);
 const board=open(state);assert.equal(board[0].id,first);assert.equal(board.filter(c=>aliases.includes(c.id)).length,1);
 state.rules.apply(state.draft,{type:'pick',cardId:board.find(c=>key(c)!==key(publicCard(first))).id});
 assert.equal(open(state,'B2')[0].id,other,'An unselected alternate card stays eligible after the first exact ID is protected');
 const history=Object.values(state.draft.cardCycle.shown).flat(),protectedBefore=[...history];
 const restarted=controlled(tier,history,cards);assert(open(restarted).every(c=>!protectedBefore.includes(c.id)),'Restart must retain protection for all actually shown IDs');
 assert.deepEqual(history,protectedBefore);
}

// A father and son may be selected in the same squad. Similar names alone must
// not cause a ban; the narrow helper is used by the actual offer/pick path.
{
 const state=controlled('Silver');state.draft.taken.push(156);state.draft.roster.B1=156;state.draft.tierCounts.Gold=1;
 const board=open(state,'B2'),son=board.find(c=>[605,755].includes(c.id));assert(son,'Kenyon Martin must not block his son');
 state.rules.apply(state.draft,{type:'pick',cardId:son.id});assert(state.draft.taken.includes(156)&&state.draft.taken.includes(son.id));
}

// Aliases are also excluded from a single captain board, even when both labels
// occur in a captain tier. Synthetic tiers isolate identity from real ratings.
{
 const cards=[publicCard(288),publicCard(1293),...fixture().filter(c=>c.id>=2400)].map(c=>({...c,tier:'Icon'}));
 const random=()=>0;random.int=()=>0;const draft=factory.create({cards,random}).start();
 assert.equal(draft.captain.length,3);assert.equal(new Set(draft.captain.map(key)).size,3);assert.equal(draft.captain.filter(c=>[288,1293].includes(c.id)).length,1);
}

// Identity correction must not alter odds, caps, release thresholds or the
// equal-ticket probability of each eligible card version.
{
 const cards=fixture();
 for(const [roll,tier]of [[0,'Bronze'],[.139999,'Bronze'],[.140001,'Silver'],[.539999,'Silver'],[.540001,'Gold'],[.939999,'Gold'],[.940001,'Elite'],[.979999,'Elite'],[.980001,'Icon'],[.999999,'Icon']]){
  const random=()=>roll;random.int=()=>0;const rules=factory.create({cards,random}),draft=rules.start();rules.apply(draft,{type:'captain',cardId:draft.captain[0].id});rules.apply(draft,{type:'open',slot:'B1'});assert(draft.opts.every(c=>c.tier===tier));
 }
 for(const tier of ['Icon','Elite']){const s=controlled(tier);s.draft.tierCounts={Icon:2,Elite:4};assert(open(s).every(c=>c.tier==='Gold'));}
 for(const tier of tiers){
  const target=cards.filter(c=>c.tier===tier).sort((a,b)=>a.id-b.id),threshold=Math.ceil(target.length*fractions[tier]);
  const state=controlled(tier);state.draft.cardCycle.shown[tier]=target.slice(0,threshold).map(c=>c.id);
  const begin=state.draft.cardCycle.events.length;open(state);
  assert.deepEqual(state.draft.cardCycle.events[begin],{type:'reset',tier},tier+' keeps its original release fraction');
 }
 const gold=cards.filter(c=>c.tier==='Gold'&&c.id!==156).slice(0,10),population=[...gold,...cards.filter(c=>c.tier==='Icon')];
 const rng=globalThis.ATUDraftRandomV1.create(createHash('sha256').update('identity-exact-card-tickets').digest('hex')),random=()=>.7;random.int=n=>rng.int(n);
 const counts=new Map(),samples=12000;
 for(let i=0;i<samples;i++){
  const rules=factory.create({cards:population,random}),draft=rules.start();rules.apply(draft,{type:'captain',cardId:draft.captain[0].id});rules.apply(draft,{type:'open',slot:'B1'});const id=draft.opts[0].id;counts.set(id,(counts.get(id)||0)+1);
 }
 assert.equal(counts.size,gold.length);for(const count of counts.values())assert(Math.abs(count-samples/gold.length)<6*Math.sqrt(samples*(1/gold.length)*(1-1/gold.length)),'Identity grouping must not restore player-first weighting');
}
console.log('Player-identity selector passed: both Robert/KJ alias directions, Portland variant, father/son and spelling distinctions, captain/offer/pick uniqueness, exact-ID restart protection, unchanged odds/caps/cycle thresholds and equal-card tickets');
