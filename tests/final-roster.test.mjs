import assert from 'node:assert/strict';
import {CARDS,MODERN_CARD_IDS} from '../supabase/functions/_shared/atu-data-v1.js';
import {CARDS as oldCards} from '../supabase/functions/_shared/roster-20260919/atu-data-v1.js';
import * as router from '../supabase/functions/_shared/atu-engine-roster-20260920.js';
const find=(n,t)=>CARDS.find(c=>c.n===n&&c.t===t);
for(const [n,t,o] of [['Eric Bledsoe','PHX',85],['Kyle Lowry','TOR',90],['DeMar DeRozan','TOR',91],['Blake Griffin','LAC',89],['John Wall','WAS',90],['Gerald Wallace','CHA',85],['David Lee','GSW',86],['Monta Ellis','GSW',85],['Tyreke Evans','SAC',85],['Goran Dragic','MIA',85],['Carlos Boozer','CHI',86],['Kevin Martin','HOU',85],['Brandon Jennings','MIL',85],['Al Jefferson','UTA',87],['Antoine Walker','BOS',86],['Stephon Marbury','PHX',86],['Stephon Marbury','MIN',87],['Kenyon Martin','BKN',87],['Andre Drummond','DET',89],['Kristaps Porzingis','NYK',91],['DeAndre Jordan','LAC',87],['Mike Conley','MEM',88],['Bradley Beal','WAS',90]]){
 assert.equal(find(n,t)?.o,o,n+' '+t);assert(MODERN_CARD_IDS.includes(find(n,t).id));
}
for(const old of oldCards){assert(find(old.n,old.t));assert.equal(CARDS.find(c=>c.id===old.id).n,old.n);assert(CARDS.find(c=>c.id===old.id).o>=old.o,'No overall reductions');}
const view=router.legacyView('atu-classic-v5');assert(view);
for(const c of oldCards){assert.equal(view.DB[c.id].ovr,c.o);assert.equal(view.DB[c.id].team,c.t);}
assert.equal(router.rulesForPool('modern','draft'),'atu-classic-v6');
assert.equal(router.rulesForPool('history','draft'),'atu-history-draft-v4');
assert.deepEqual(find('Bradley Beal','WAS').g.filter(t=>t.startsWith('Era_')),oldCards.find(c=>c.n==='Bradley Beal'&&c.t==='WAS').g.filter(t=>t.startsWith('Era_')));
assert.deepEqual(find('Deron Williams','UTA').g.filter(t=>t.startsWith('Era_')),oldCards.find(c=>c.n==='Deron Williams'&&c.t==='UTA').g.filter(t=>t.startsWith('Era_')));
console.log('Final additions, higher OVR preservation, eras, stable IDs and frozen previous roster passed');
