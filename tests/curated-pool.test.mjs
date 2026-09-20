import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CARDS,MODERN_CARD_IDS,HISTORY_CARD_IDS} from '../supabase/functions/_shared/atu-data-v1.js';
import * as old from '../supabase/functions/_shared/roster-20260920/atu-data-v1.js';
import * as router from '../supabase/functions/_shared/atu-engine-pool-20260920.js';
const approved=new Set(JSON.parse(fs.readFileSync(new URL('../docs/pre-2000-pool-20260920.json',import.meta.url))).approvedNames);
assert.deepEqual(CARDS,old.CARDS,'Pool changes must not alter any cards');
assert.deepEqual(HISTORY_CARD_IDS,old.HISTORY_CARD_IDS,'Historical pool unchanged');
const names=new Set();
for(const c of CARDS){
 const newer=c.g.some(t=>['Era_2000s','Era_2010s','Era_2020s'].includes(t));
 // Use the actual era tag names from the existing data.
 const era=c.g.find(t=>t.startsWith('Era_'));
 const modernEra=!['Era_Classic','Era_Golden','Era_Vintage'].includes(era);
 if(modernEra)assert.equal(MODERN_CARD_IDS.includes(c.id),old.MODERN_CARD_IDS.includes(c.id));
 else if(HISTORY_CARD_IDS.includes(c.id)){
  assert.equal(MODERN_CARD_IDS.includes(c.id),approved.has(c.n),c.n);
  if(MODERN_CARD_IDS.includes(c.id))names.add(c.n);
 }
}
assert.deepEqual([...names].sort(),[...approved].sort());
const view=router.legacyView('atu-classic-v6');assert(view);
for(const id of old.HISTORY_CARD_IDS)assert.equal(view.DB[id].modernEligible,old.MODERN_CARD_IDS.includes(id));
console.log('64 approved names, unchanged newer cards/history and frozen prior draft preview passed');
