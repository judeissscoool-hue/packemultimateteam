import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import * as engine from '../supabase/functions/_shared/atu-engine-uniform-20260928.js';
import * as old from '../supabase/functions/_shared/atu-engine-ratings-20260920.js';
import {CARDS as modern} from '../supabase/functions/_shared/ratings-20260920/modern-data.js';
import {CARDS as history} from '../supabase/functions/_shared/ratings-20260920/history-data.js';
const seed=i=>createHash('sha256').update('uniform-regression-'+i).digest('hex');
const fair={session:500,shown:{'LeBron James':10000},last:{'LeBron James':499},cards:{222:10000}};
for(const version of old.SUPPORTED_RULES_VERSIONS.filter(v=>old.isClassicRulesVersion(v))){
 assert.deepEqual(engine.createClassicSession(seed(1),[],version,fair).draft,old.createClassicSession(seed(1),[],version,fair).draft,'Legacy replay changed: '+version);
}
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ctx=vm.createContext({console});
vm.runInContext(html.match(/<script>\s*\/\/<LOGIC>([\s\S]*?)\/\/<\/LOGIC>/)[1],ctx);
const local=vm.runInContext('DB.filter(p=>p.acquisitionActive)',ctx);
for(const [pool,cards] of [['modern',modern],['history',history]]){
 const version=engine.rulesForPool(pool,'draft');
 assert.equal(engine.usesDraftHistory(version),false);
 assert.deepEqual(engine.createClassicSession(seed(2),[],version,fair).draft,engine.createClassicSession(seed(2),[],version,null).draft,'Account history must have no effect');
 const localCards=local.filter(p=>pool==='history'||p.modernEligible);
 assert.deepEqual([...localCards.map(c=>c.id)].sort((a,b)=>a-b),cards.map(c=>c.id).sort((a,b)=>a-b),'Local/account pool parity');
 for(const c of cards){const p=localCards.find(p=>p.id===c.id);assert.equal(p.tier,c.r);assert.deepEqual([...p.positions],c.ps);}
 const seen=new Set();
 for(let i=0;i<2000;i++){
  const s=engine.createClassicSession(seed(i),[],version,fair),events=[];
  const apply=e=>{s.apply(e);events.push(e);};
  const observe=opts=>{assert.equal(new Set(opts.map(c=>c.name)).size,opts.length);opts.forEach(c=>seen.add(c.id));};
  observe(s.draft.captain);
  apply({type:'captain',cardId:s.draft.captain[0].id});
  for(const slot of engine.ALL_SLOTS)if(s.draft.roster[slot]==null){
   apply({type:'open',slot});assert.equal(s.draft.opts.length,5);observe(s.draft.opts);
   for(const c of s.draft.opts){assert(!s.draft.taken.some(id=>cards.find(p=>p.id===id).n===c.name));assert(slot.startsWith('B')||c.positions.includes(slot));}
   apply({type:'pick',cardId:s.draft.opts[i%5].id});
  }
  if(i<10){assert.deepEqual(engine.createClassicSession(seed(i),events,version).draft,s.draft);assert.deepEqual(engine.validateTranscript(seed(i),[...events,{type:'arrange',roster:s.draft.roster}],'draft',version).roster,s.draft.roster);}
 }
 assert.equal(seen.size,cards.length,'All approved pool cards must be reachable, including depth cards');
 console.log(pool+': '+seen.size+'/'+cards.length+' cards offered across 2000 complete drafts');
}
// Controlled first-captain draw: each card is one ticket, even duplicate names,
// tiny spotlight weights and extremely skewed historical exposure.
const cards=Array.from({length:10},(_,id)=>({id,name:id<3?'Variants':'Player '+id,tier:'Icon',pos:'PG',positions:['PG'],ovr:96}));
let state=19381;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
const counts=Array(10).fill(0);
for(let i=0;i<100000;i++)counts[globalThis.ATUUniformDraftRules.create({cards,random,weights:{Variants:.001},fair}).start().captain[0].id]++;
assert(counts.every(n=>Math.abs(n-10000)<400),'Uniform first-choice frequencies outside 4% tolerance');
console.log('Equal-card draw frequencies:',counts.join(', '));
console.log('Uniform drafts: legacy compatibility, history independence, full coverage, positions, duplicates and local/account parity passed');
