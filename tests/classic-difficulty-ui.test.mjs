import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import * as router from '../supabase/functions/_shared/atu-engine-classic-difficulty-20261010.js';
import * as oldRouter from '../supabase/functions/_shared/atu-engine-card-cycle-identity-20261007.js';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const logic=html.match(/<script>\s*\/\/<LOGIC>([\s\S]*?)\/\/<\/LOGIC>/)[1];
const helper=fs.readFileSync(new URL('../supabase/functions/_shared/classic-win-curve-20261010.js',import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const seed=n=>createHash('sha256').update('classic-difficulty-ui-'+n).digest('hex');
let screenRules=null,signedDraft=null,challengeDraft=null,packRules='atu-pack-v8';
const backend={
  legacyView:router.legacyView,
  getGameSession:mode=>mode==='draft'?signedDraft:null,
  gameRulesVersion:mode=>mode==='draft'?signedDraft?.version:packRules,
  classicDraftState:()=>challengeDraft?.draft,
  challengeRulesVersion:()=>challengeDraft?.version,
  isSignedIn:()=>false
};
const ui=vm.createContext({console,URLSearchParams,currentRunRules:()=>screenRules,ATUBackend:backend,
  location:{origin:'https://example.test',pathname:'/',search:'',hash:''}});
vm.runInContext(helper+'\n'+logic+`
globalThis.score=(roster,version)=>{const o=teamOVR(roster,version);return {
  teamOvr:o.total,chemistry:o.chem.bonus,effectiveRating:+o.eff.toFixed(4),
  projectedWins:projection(o.eff,o.resultRulesVersion).wins,resultRulesVersion:o.resultRulesVersion,gated:o.gated};};
globalThis.curve=projection;globalThis.oldBoundary=PERFECT_BOUNDARY;
globalThis.near=nearMissChem;globalThis.rules=rosterResultRules;
globalThis.resolveProjection=rosterProjection;globalThis.model=teamOVR;
`,ui);
for(const block of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(block[1]);
assert(html.indexOf('classic-win-curve-20261010.js')<html.indexOf('backend.js?v=classic-difficulty-20261010'));
assert.match(fs.readFileSync(new URL('../backend.js',import.meta.url),'utf8'),/atu-engine-classic-difficulty-20261010\.js\?draft=classic-difficulty-20261010/);

// The browser and trusted engine calculate identical results for both pools.
// These are legal offered rosters, not fabricated score-only card combinations.
let roster;const rosters={};
for(const version of ['atu-classic-v15','atu-history-draft-v13'])for(let n=0;n<30;n++){
  const session=router.createClassicSession(seed(version+n),[],version);
  const highest=options=>options.reduce((a,b)=>b.ovr>a.ovr?b:a);
  session.apply({type:'captain',cardId:highest(session.draft.captain).id});
  for(const slot of router.ALL_SLOTS)if(session.draft.roster[slot]===null){
    session.apply({type:'open',slot});session.apply({type:'pick',cardId:highest(session.draft.opts).id});
  }
  roster=plain(session.draft.roster);
  rosters[version==='atu-classic-v15'?'modern':'history']=roster;
  ui.D={roster,done:true,resultRulesVersion:version};
  const actual=plain(ui.score(roster)),expected=router.calculateResult(roster,version);
  for(const key of ['teamOvr','chemistry','effectiveRating','projectedWins'])assert.equal(actual[key],expected[key],version+' '+key);
  assert.equal(actual.resultRulesVersion,version);
  const restored=plain(ui.D);ui.D=restored;
  assert.equal(ui.rules(restored.roster),version,'Local result marker survives JSON serialization');
}

// A new Classic roster retains its rules away from the draft screen. Recognized
// Daily, Pack and collection rosters do not inherit the current screen's rules.
roster=rosters.modern;
ui.D={roster:plain(roster),done:true,resultRulesVersion:'atu-classic-v15'};
ui.S={main:{roster:plain(roster)},classic:{roster:plain(roster)},rare:{roster:plain(roster)}};
ui.DD={roster:plain(roster)};
screenRules='atu-classic-v15';
assert.equal(ui.rules(ui.D.roster),'atu-classic-v15');
assert.equal(ui.rules(ui.S.main.roster),null);assert.equal(ui.rules(ui.S.rare.roster),null);
assert.equal(ui.rules(ui.S.classic.roster),'atu-pack-v8');assert.equal(ui.rules(ui.DD.roster),null);
for(const r of [ui.S.main.roster,ui.S.classic.roster,ui.S.rare.roster,ui.DD.roster])assert.equal(ui.score(r).projectedWins,ui.score(r,null).projectedWins);
const oldGuest={roster:plain(roster),done:true};ui.D=oldGuest;
assert.equal(ui.rules(oldGuest.roster),null,'Unmarked earlier guest draft keeps original curve');
for(const version of ['atu-classic-v14','atu-history-draft-v12']){
  ui.D={roster:plain(version==='atu-classic-v14'?rosters.modern:rosters.history),resultRulesVersion:version};
  assert.equal(ui.score(ui.D.roster).projectedWins,oldRouter.calculateResult(ui.D.roster,version).projectedWins);
}
signedDraft={version:'atu-history-draft-v13',draft:{roster:plain(roster)}};
assert.equal(ui.rules(signedDraft.draft.roster),'atu-history-draft-v13');
challengeDraft={version:'atu-classic-v15',draft:{roster:plain(roster)}};
assert.equal(ui.rules(challengeDraft.draft.roster),'atu-classic-v15');
signedDraft=null;challengeDraft=null;

// Exercise routing with a genuinely different temporary curve even before the
// production anchor is calibrated. Only this VM's helper is replaced.
const actualHelper=ui.ATUClassicWinCurveV1;
const alternate=helper.replace(/const UPPER_ANCHOR = [^;]+;/,'const UPPER_ANCHOR = 112;');
vm.runInContext(alternate,ui);
const between=(ui.oldBoundary.winning+ui.ATUClassicWinCurveV1.boundary.winning)/2;
assert.equal(ui.curve(between,null).wins,82);
assert(ui.curve(between,'atu-classic-v15').wins<82);
assert(ui.curve(between,'atu-history-draft-v13').wins<82);
for(let i=0;i<=1000;i++){
  const eff=60+i*.04;
  assert.equal(ui.curve(eff,'atu-classic-v15').wins,ui.curve(eff,null).wins,'Below-80 anchors remain unchanged');
}
assert.equal(ui.curve(ui.ATUClassicWinCurveV1.gateCap,'atu-classic-v15').wins,81);
assert.equal(ui.curve(ui.ATUClassicWinCurveV1.boundary.winning,'atu-classic-v15').wins,82);
const required=ui.near({ready:true,full:true,minOvr:85,eff:between,resultRulesVersion:'atu-classic-v15'});
assert.equal(required.hit,false);assert(required.needed>0);
assert.equal(ui.near({ready:true,full:true,minOvr:85,eff:between,resultRulesVersion:null}).hit,true);
assert.equal(ui.near({ready:true,full:true,minOvr:84,eff:200,resultRulesVersion:'atu-classic-v15'}).gated,true);
ui.ATUClassicWinCurveV1=actualHelper;

// Links carry only the two whitelisted new Classic result versions. Earlier
// links and Pack links retain the original curve, including forged query flags.
vm.runInContext(html.slice(html.indexOf('function buildShareURL('),html.indexOf('function copyText('))+
  ';globalThis.buildLink=buildShareURL;globalThis.parseLink=parseShare;',ui);
for(const version of ['atu-classic-v15','atu-history-draft-v13']){
  ui.D={roster:plain(version==='atu-classic-v15'?rosters.modern:rosters.history),resultRulesVersion:version};
  const url=ui.buildLink('draft',ui.D.roster);
  assert.match(url,new RegExp('resultRulesVersion='+version));
  ui.location.search=new URL(url).search;
  const shared=ui.parseLink();ui.SHARED=shared;
  assert.equal(shared.resultRulesVersion,version);assert.equal(ui.rules(shared.roster),version);
  assert.equal(ui.score(shared.roster).projectedWins,router.calculateResult(shared.roster,version).projectedWins);
}
const oldUrl=ui.buildLink('draft',roster,null);assert.doesNotMatch(oldUrl,/resultRulesVersion/);
ui.location.search=new URL(oldUrl).search;ui.SHARED=ui.parseLink();assert.equal(ui.rules(ui.SHARED.roster),null);
ui.location.search=new URL(ui.buildLink('classic',roster,'atu-classic-v15')).search+'&resultRulesVersion=atu-classic-v15';
ui.SHARED=ui.parseLink();assert.equal(ui.rules(ui.SHARED.roster),null,'Pack links cannot select the new Classic dial');
ui.location.search=new URL(oldUrl).search+'&resultRulesVersion=unknown';ui.SHARED=ui.parseLink();assert.equal(ui.rules(ui.SHARED.roster),null);

// Invoke the actual guest/era start function: both stages retain the version,
// without changing the existing card-cycle factory, seed or release map.
ui.ATUDraftRandomV1={freshSeed:()=>seed('local')};ui.startingNormalRun=false;
ui.localDraftRules=()=>({start:()=>({roster:plain(roster),stage:'captain',cardCycle:{shown:{}}})});
ui.persistCardCycle=()=>{};ui.render=()=>{};
vm.runInContext(html.slice(html.indexOf('async function startDraft('),html.indexOf('function pickCaptain('))+
  ';globalThis.startLocal=startDraft;globalThis.setPool=p=>{ROSTER_POOL=p;};',ui);
for(const [pool,version]of [['modern','atu-classic-v15'],['history','atu-history-draft-v13']]){
  ui.setPool(pool);await ui.startLocal();assert.equal(ui.D.resultRulesVersion,version);assert.equal(ui.rules(ui.D.roster),version);
  await ui.startLocal("'10s");assert.equal(ui.D.resultRulesVersion,version);
}

console.log('Classic difficulty UI: both-pool parity, mixed-roster/guest/challenge routing, true curve/gate/near-miss boundaries, serialized markers and whitelisted shares passed');
