import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as current from '../supabase/functions/_shared/atu-data-v1.js';
import * as prior from '../supabase/functions/_shared/pool-20260920/atu-data-v1.js';
import * as router from '../supabase/functions/_shared/atu-engine-ratings-20260920.js';
const changes=JSON.parse(fs.readFileSync(new URL('../docs/fair-career-ratings-20260920.json',import.meta.url)));
assert.equal(changes.length,11);
assert.equal(current.CARDS.length,prior.CARDS.length);
assert.deepEqual(current.MODERN_CARD_IDS,prior.MODERN_CARD_IDS);
assert.deepEqual(current.HISTORY_CARD_IDS,prior.HISTORY_CARD_IDS);
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ctx=vm.createContext({console});vm.runInContext(html.match(/<script>\s*\/\/<LOGIC>([\s\S]*?)\/\/<\/LOGIC>/)[1]+';globalThis.cards=DB;',ctx);
let changed=0;
for(const c of current.CARDS){
 const old=prior.CARDS.find(x=>x.id===c.id),change=changes.find(x=>x.name===c.n&&x.team===c.t);
 assert.deepEqual(c,{...old,o:change?change.after:old.o,r:change?(change.after>=75?'Silver':'Bronze'):old.r},'Only OVR and derived rarity may change: '+c.n);
 assert.equal(ctx.cards[c.id].ovr,c.o);
 if(change){assert.equal(old.o,change.before);changed++;}
 for(const version of ['atu-classic-v7','atu-pack-v7','atu-history-draft-v5','atu-history-pack-v5'])assert.equal(router.legacyView(version).DB[c.id].ovr,old.o);
}
assert.equal(changed,11);
assert(current.CARDS.every(c=>c.o>=70));
for(const k of ['modern','history']){
 const before=fs.readFileSync(new URL('../supabase/functions/_shared/pool-20260920/'+k+'-engine.js',import.meta.url),'utf8');
 const after=fs.readFileSync(new URL('../supabase/functions/_shared/ratings-20260920/'+k+'-engine.js',import.meta.url),'utf8');
 assert.equal(after,before.replaceAll('atu-pool-v1','atu-ratings-v1').replaceAll('atu-classic-v7','atu-classic-v8').replaceAll('atu-pack-v7','atu-pack-v8').replaceAll('atu-history-draft-v5','atu-history-draft-v6').replaceAll('atu-history-pack-v5','atu-history-pack-v6'),'No curve or odds changes');
}
console.log('11 fair ratings, browser/server parity, unchanged pools/curve/odds and frozen previous drafts passed');
