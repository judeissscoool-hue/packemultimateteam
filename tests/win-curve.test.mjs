import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as router from '../supabase/functions/_shared/atu-engine-v1.js';

const logic=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').match(/<script>\s*\/\/<LOGIC>([\s\S]*?)\/\/<\/LOGIC>/)[1];
let version=null;
const ui=vm.createContext({console,currentRunRules:()=>version,ATUBackend:{legacyView:router.legacyView}});
vm.runInContext(logic+';globalThis.curve=projection;globalThis.boundary=PERFECT_BOUNDARY;',ui);
function serverCurve(path){
 const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');
 const context=vm.createContext({});
 vm.runInContext(source.match(/const EIGHTY_TWO_EFF = [^;]+;/)[0]+source.match(/const PROJECTION_POINTS = [^;]+;/)[0]+source.slice(source.indexOf('function projectWins('),source.indexOf('let perfectGateCap;'))+';globalThis.curve=projectWins;',context);
 return context.curve;
}
const modern=serverCurve('../supabase/functions/_shared/gmm-20260916/modern-engine.js');
const history=serverCurve('../supabase/functions/_shared/gmm-20260916/history-engine.js');
const old=serverCurve('../supabase/functions/_shared/gmm-20260913/modern-engine.js');
assert.equal(ui.curve(97.8).wins,79);assert.equal(old(97.8),78);
assert.equal(ui.curve(96.4).wins,77);assert.equal(old(96.4),78);
assert.equal(ui.curve(97).wins,78);
assert.equal(ui.curve(97.7499).wins,78);assert.equal(ui.curve(97.7501).wins,79);
assert.equal(ui.curve(102.3999).wins,81);assert.equal(ui.curve(102.4001).wins,82);
assert.equal(ui.curve(ui.boundary.cap).wins,81);assert.equal(ui.curve(ui.boundary.winning).wins,82);
let previous=0,maxChange=0;
for(let i=0;i<=150000;i++){
 const e=50+i/2000,p=ui.curve(e),a=modern(e),b=old(e);
 assert.equal(p.wins,a);assert.equal(history(e),a);assert.equal(p.wins+p.losses,82);
 assert(a>=previous);previous=a;assert.equal(a===82,b===82);
 if(e>=100)assert.equal(a,b,'Calibrated 80–82 segment must remain exactly unchanged');
 maxChange=Math.max(maxChange,Math.abs(a-b));
}
for(const [e,w] of [[60,15],[70,26],[75,31],[80,38],[84,46],[87,54],[90,65],[92,70],[95,76],[97,78],[100,80],[103.6,82]])assert.equal(ui.curve(e).wins,w);
for(const v of ['atu-classic-v3','atu-pack-v3','atu-history-draft-v1','atu-history-pack-v1']){
 version=v;
 for(let i=0;i<=5000;i++)assert.equal(ui.curve(60+i/100).wins,old(60+i/100),'In-progress GMM-v1 preview stays frozen');
 const engine=router.getEngineForRules(v);assert.equal(engine.ENGINE_VERSION,'atu-gmm-v1');
}
assert.equal(router.rulesForPool('modern','draft'),'atu-classic-v4');
assert.equal(router.rulesForPool('history','pack'),'atu-history-pack-v2');
console.log(`Win curve: 150001 client/server grid checks, same 82 boundary, unchanged anchors, old previews preserved; maximum grid change ${maxChange} wins`);
