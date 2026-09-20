import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as router from '../supabase/functions/_shared/atu-engine-ratings-20260920.js';
import {CARDS,MODERN_CARD_IDS,HISTORY_CARD_IDS} from '../supabase/functions/_shared/atu-data-v1.js';
import {CARDS as oldCards} from '../supabase/functions/_shared/legacy/atu-data-v1.js';
const cards=new Map(CARDS.map(p=>[p.id,p]));
assert(CARDS.length>1142);assert(MODERN_CARD_IDS.length>900);assert(HISTORY_CARD_IDS.length>1141);
const frozen=router.getEngineForRules('atu-classic-v4');
for(const old of oldCards){const p=cards.get(old.id);assert(p,'Saved card ID must remain readable');if(old.id!==173)assert.equal(p.n,old.n);}
assert(!HISTORY_CARD_IDS.includes(173));assert(HISTORY_CARD_IDS.includes(147));
assert.equal(cards.get(147).n,cards.get(173).n,'Hamilton alias remains readable but cannot be pulled twice');
assert(MODERN_CARD_IDS.every(id=>HISTORY_CARD_IDS.includes(id)));
assert(CARDS.filter(p=>p.n==='Yao Ming').every(p=>!p.g.includes('Style_Sharpshooter')));
assert(CARDS.every(p=>p.g.filter(t=>t.startsWith('Style_')).length<=2));
assert(CARDS.flatMap(p=>p.g).filter(t=>t.startsWith('Story_Draft_')).every(t=>['1984','1996','2003','2009','2018'].includes(t.slice(-4))));
assert.throws(()=>router.getEngineForRules('unknown'),/Unsupported/);
assert.throws(()=>router.rulesForPool('typo','draft'),/Invalid/);
const clean=v=>JSON.parse(JSON.stringify(v,(k,value)=>k==="cardPool"?undefined:value));
for(const version of router.SUPPORTED_RULES_VERSIONS){
 const engine=router.getEngineForRules(version);
 assert.equal(engine.ENGINE_VERSION,router.isLegacyRulesVersion(version)?'atu-challenge-v3':(['atu-classic-v3','atu-pack-v3','atu-history-draft-v1','atu-history-pack-v1'].includes(version)?'atu-gmm-v1':['atu-classic-v4','atu-pack-v4','atu-history-draft-v2','atu-history-pack-v2'].includes(version)?'atu-gmm-v2':['atu-classic-v5','atu-pack-v5','atu-history-draft-v3','atu-history-pack-v3'].includes(version)?'atu-roster-v1':['atu-classic-v6','atu-pack-v6','atu-history-draft-v4','atu-history-pack-v4'].includes(version)?'atu-roster-v2':['atu-classic-v7','atu-pack-v7','atu-history-draft-v5','atu-history-pack-v5'].includes(version)?'atu-pool-v1':'atu-ratings-v1'));
 if(version==='atu-v1')continue;
 const isPack=version.includes('pack'),mode=isPack?'pack':'draft';
 for(let i=0;i<8;i++){
  const seed=i.toString(16).padStart(64,'0'),events=[];
  const routed=isPack?router.createClassicPackSession(seed,[],version):router.createClassicSession(seed,[],version);
  const direct=isPack?engine.createClassicPackSession(seed):engine.createClassicSession(seed);
  const apply=e=>{const a=routed.apply(e),b=direct.apply(e);assert.deepEqual(clean(a),clean(b));events.push(e);return a;};
  if(isPack){const ids=apply({type:'captainOpen'});apply({type:'captain',cardId:ids[0]});for(let p=0;p<routed.pack.cap;p++)apply({type:'pack',pack:p<3?'premium':'standard'});assert.deepEqual(routed.pack.ids,direct.pack.ids);}
  else{apply({type:'captain',cardId:routed.draft.captain[0].id});for(const slot of router.ALL_SLOTS)if(routed.draft.roster[slot]==null){apply({type:'open',slot});apply({type:'pick',cardId:routed.draft.opts[0].id});}assert.deepEqual(router.validateTranscript(seed,[...events,{type:'arrange',roster:routed.draft.roster}],mode,version),engine.validateTranscript(seed,[...events,{type:'arrange',roster:direct.draft.roster}],mode,version));}
  const restored=isPack?router.createClassicPackSession(seed,events,version):router.createClassicSession(seed,events,version);
  assert.deepEqual(restored.pack||restored.draft,routed.pack||routed.draft,'Restore preserves the original run pool');
 }
}
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),logic=html.match(/<script>\s*\/\/<LOGIC>([\s\S]*?)\/\/<\/LOGIC>/)[1];
let version=null;
const ui=vm.createContext({console,currentRunRules:()=>version,ATUBackend:{legacyView:router.legacyView}});
vm.runInContext(logic+';globalThis.score=r=>{const o=teamOVR(r);return {ovr:o.total,chem:o.chem.bonus,w:projection(o.eff).wins};};globalThis.pool=(p)=>{ROSTER_POOL=p;return TIER_ORDER.flatMap(t=>eraPool(t)).map(c=>c.id);};',ui);
assert.deepEqual(clean(ui.pool('modern')).sort((a,b)=>a-b),[...MODERN_CARD_IDS].sort((a,b)=>a-b));
assert.deepEqual(clean(ui.pool('history')).sort((a,b)=>a-b),[...HISTORY_CARD_IDS].sort((a,b)=>a-b));
for(const name of ['perfect-draft','gmm-perfect-draft']){
 const f=JSON.parse(fs.readFileSync(new URL('./'+name+'.json',import.meta.url)));version=f.rulesVersion;
 const r=router.validateTranscript(f.seed,[...f.events,{type:'arrange',roster:f.roster}],'draft',version).result;
 assert.equal(r.projectedWins,82);assert.deepEqual(r,f.result);assert.deepEqual(clean(ui.score(f.roster)),{ovr:r.teamOvr,chem:r.chemistry,w:82});
}
console.log('GMM pools, stable IDs, versioned replay and legacy/new 82-0 preview passed');

