import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {CARDS,MODERN_CARD_IDS,HISTORY_CARD_IDS} from '../supabase/functions/_shared/atu-data-v1.js';
import {CARDS as frozenCards} from '../supabase/functions/_shared/gmm-20260913/atu-data-v1.js';
import * as router from '../supabase/functions/_shared/atu-engine-ratings-20260920.js';
const active=CARDS.filter(c=>HISTORY_CARD_IDS.includes(c.id)),find=(n,t)=>active.find(c=>c.n===n&&c.t===t);
const decisions=JSON.parse(fs.readFileSync(new URL('../docs/approved-roster-20260919.json',import.meta.url)));
for(const [key,rating]of Object.entries(decisions.overrides)){const[n,t]=key.split('|');if(decisions.oneCardPlayers.includes(n)&&decisions.currentTeams[n]!==t)continue;assert.equal(find(n,t)?.o,rating,key);}
for(const name of decisions.oneCardPlayers)assert.equal(active.filter(c=>c.n===name).length,1,'One current card: '+name);
assert(!active.some(c=>c.n==='Ben Simmons'));assert(!find('Mario Hezonja','ORL'));assert(!find('Kris Dunn','ATL'));assert(!find('Luke Kennard','DET'));
assert(!find('Jalen Williams','OKC').ps.includes('C'));assert(!find('Zion Williamson','NOP').ps.includes('PG'));
assert.deepEqual(find('Dyson Daniels','ATL').ps,['PG','SG','SF']);assert.deepEqual(find('Kawhi Leonard','TOR').ps,['SG','SF','PF']);
assert.equal(find('Caleb Wilson','CHI').p,'PF');assert.equal(find('Luka Garza','BOS').p,'C');assert.equal(find('Cameron Boozer','MEM').p,'PF');
assert(find('Al Horford','ATL').g.includes('Style_PaintBeast'));assert(!find('Al Horford','ATL').g.includes('Style_Sharpshooter'));
assert(find('Robert Williams III','BOS').g.includes('Story_Draft_2018'));assert(!find('Fred VanVleet','HOU').g.some(t=>t.startsWith('Story_Draft_')));
assert.equal(active.length,decisions.activeCards+7);assert.equal(CARDS.length,decisions.totalCards+7);
for(const c of active){assert(c.ps.length&&c.ps.every(p=>['PG','SG','SF','PF','C'].includes(p)));assert.equal(new Set(c.ps).size,c.ps.length);assert(c.g.filter(t=>t.startsWith('Style_')).length<=2);}
assert.equal(new Set(active.map(c=>c.n+'|'+c.t+'|'+c.g.find(t=>t.startsWith('Era_')))).size,active.length,'No redundant player/franchise/era copies');
for(const old of frozenCards){assert(CARDS.some(c=>c.id===old.id&&c.n===old.n),'Old IDs remain readable');}
const oldView=router.legacyView('atu-classic-v4');assert(oldView);for(const c of frozenCards){const p=oldView.DB[c.id];assert.equal(p.name,c.n);assert.equal(p.team,c.t);assert.equal(p.ovr,c.o);assert.deepEqual(Array.from(p.positions),c.ps);}
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),logic=html.match(/<script>\s*\/\/<LOGIC>([\s\S]*?)\/\/<\/LOGIC>/)[1],ctx=vm.createContext({console});vm.runInContext(logic+';globalThis.cards=JSON.parse(JSON.stringify(DB));',ctx);
for(const c of CARDS){const p=ctx.cards[c.id];assert.equal(p.name,c.n);assert.equal(p.team,c.t);assert.equal(p.ovr,c.o);assert.deepEqual(Array.from(p.positions),c.ps);assert.deepEqual(Array.from(p.tags),c.g);}
for(const c of active.filter(c=>decisions.reviewedNames.includes(c.n)))assert(MODERN_CARD_IDS.includes(c.id),'Approved roster stays in Modern & Nostalgia');
for(const [oldFile,newFile] of [['gmm-20260916/modern-engine.js','roster-20260919/modern-engine.js'],['gmm-20260916/history-engine.js','roster-20260919/history-engine.js']]){
 const read=f=>fs.readFileSync(new URL('../supabase/functions/_shared/'+f,import.meta.url),'utf8');
 for(const setting of ['EIGHTY_TWO_EFF','PERFECT_MIN_OVR','PROJECTION_POINTS','DRAFT_ODDS','PACK_ODDS','PREMIUM_PACK_ODDS'])assert.equal(read(oldFile).match(new RegExp('const '+setting+' = (.*);'))[1],read(newFile).match(new RegExp('const '+setting+' = (.*);'))[1],setting+' unchanged');
}
console.log('Approved ratings, positions, duplicate policy, exclusions, chemistry, frozen saves and client/server parity passed');
