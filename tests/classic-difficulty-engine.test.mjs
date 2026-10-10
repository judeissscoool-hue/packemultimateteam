import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import * as engine from '../supabase/functions/_shared/atu-engine-classic-difficulty-20261010.js';
import * as previous from '../supabase/functions/_shared/atu-engine-card-cycle-identity-20261007.js';
import {CARDS as modern,DUOS as modernDuos} from '../supabase/functions/_shared/ratings-20260920/modern-data.js';
import {CARDS as history} from '../supabase/functions/_shared/ratings-20260920/history-data.js';

const curve=globalThis.ATUClassicWinCurveV1;
const tiers=['Bronze','Silver','Gold','Elite','Icon'];
const fractions={Bronze:.85,Silver:.85,Gold:.85,Elite:.85,Icon:.6};
const policy=shown=>({kind:'card-cycle-rarity-v1',releaseFractions:{...fractions},shown:[...shown]});
const seed=i=>createHash('sha256').update('classic-difficulty-regression-'+i).digest('hex');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const plain=value=>JSON.parse(JSON.stringify(value));
const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const highest=cards=>cards.reduce((a,b)=>b.ovr>a.ovr?b:a);

assert.equal(engine.ENGINE_VERSION,'atu-classic-difficulty-v1');
assert.equal(engine.CLASSIC_RULES_VERSION,'atu-classic-v15');
assert.equal(engine.rulesForPool('history','draft'),'atu-history-draft-v13');
for(const pool of ['modern','history'])assert.equal(engine.rulesForPool(pool,'pack'),previous.rulesForPool(pool,'pack'),'Pack keeps its previous rules');
for(const version of previous.SUPPORTED_RULES_VERSIONS){
 assert.equal(engine.getEngineForRules(version),previous.getEngineForRules(version),'Every saved ruleset retains its exact old engine');
 for(const helper of ['usesDraftHistory','usesCardCycleHistory','usesRarityCardCycleHistory','isClassicRulesVersion','isLegacyRulesVersion'])assert.equal(engine[helper](version),previous[helper](version),helper+' old '+version);
}
assert.equal(engine.SUPPORTED_RULES_VERSIONS.length,previous.SUPPORTED_RULES_VERSIONS.length+2);
assert.equal(new Set(engine.SUPPORTED_RULES_VERSIONS).size,engine.SUPPORTED_RULES_VERSIONS.length);

// Load the frozen curve independently. It remains the oracle below 80 wins;
// the new upper segment is deliberately allowed to have a different boundary.
const oldSource=read('../supabase/functions/_shared/card-cycle-identity-20261007/modern-engine.js');
const oldContext=vm.createContext({});
vm.runInContext(oldSource.match(/const EIGHTY_TWO_EFF = [^;]+;/)[0]+oldSource.match(/const PROJECTION_POINTS = [^;]+;/)[0]+oldSource.slice(oldSource.indexOf('function projectWins('),oldSource.indexOf('let perfectGateCap;'))+';globalThis.curve=projectWins;',oldContext);
assert(Number.isFinite(curve.upperAnchor)&&curve.upperAnchor>=103.6,'A harder Classic curve must not lower the old upper anchor');
assert(Object.isFrozen(curve)&&Object.isFrozen(curve.boundary));
assert.equal(curve.gateCap,curve.boundary.nonWinning);
assert.equal(curve.projectWins(curve.boundary.nonWinning),81);
assert.equal(curve.projectWins(curve.boundary.winning),82);
assert(curve.boundary.nonWinning<curve.boundary.winning);
assert(Math.abs(curve.boundary.winning-(100+(curve.upperAnchor-100)*2/3))<1e-11,'Rounded cosine 82 boundary has the expected analytic location');
for(const [rating,wins]of [[60,15],[70,26],[75,31],[80,38],[84,46],[87,54],[90,65],[92,70],[95,76],[97,78],[100,80]])assert.equal(curve.projectWins(rating),wins);
let last=0;
for(let i=0;i<=70000;i++){
 const rating=50+i/1000,wins=curve.projectWins(rating);
 assert(Number.isInteger(wins)&&wins>=12&&wins<=82);assert(wins>=last);last=wins;
 if(rating<=100)assert.equal(wins,oldContext.curve(rating),'Do not change lower-win progression');
 assert(wins<=oldContext.curve(rating),'Difficulty must never reward an identical rating with more wins');
}

// The same synchronous helper executes in a separate browser-like realm.
const helperSource=read('../supabase/functions/_shared/classic-win-curve-20261010.js');
const browser=vm.createContext({});vm.runInContext(helperSource,browser);
for(let i=0;i<=14000;i++)assert.equal(browser.ATUClassicWinCurveV1.projectWins(50+i/200),curve.projectWins(50+i/200));
assert.deepEqual(plain(browser.ATUClassicWinCurveV1.boundary),curve.boundary);

// These old identity-version fingerprints include scoring as well as every
// board and ordered history event; they were captured before the new files.
for(const [version,cards,expected]of [
 ['atu-classic-v14',modern,'a9c2816d6557f6534b86548839f2c1fdfae3f968c7355d96f3db81e52573d6bf'],
 ['atu-history-draft-v12',history,'b76bb720bcd8a27fb59b67e097b0fad8356c87e876220bf88ffb8714f24f61c8']
]){
 const fairness=policy(tiers.flatMap(tier=>{const pool=cards.filter(c=>c.r===tier);return pool.slice(0,Math.ceil(pool.length*.8)).map(c=>c.id);}));
 const draftSeed='0123456789abcdef'.repeat(4),session=engine.createClassicSession(draftSeed,[],version,fairness),boards=[session.draft.captain.map(c=>c.id)];
 session.apply({type:'captain',cardId:session.draft.captain[0].id});
 for(const slot of engine.ALL_SLOTS)if(session.draft.roster[slot]===null){session.apply({type:'open',slot});boards.push(session.draft.opts.map(c=>c.id));session.apply({type:'pick',cardId:session.draft.opts[0].id});}
 assert.equal(hash({boards,roster:session.draft.roster,events:session.draft.cardCycle.events,result:engine.calculateResult(session.draft.roster,version)}),expected,'Frozen '+version+' must retain its offers, history and result');
}

let gatedChecks=0,oldPerfect=0,newPerfect=0;
for(const [pool,cards,oldVersion,newVersion]of [
 ['modern',modern,'atu-classic-v14','atu-classic-v15'],
 ['history',history,'atu-history-draft-v12','atu-history-draft-v13']
]){
 const byId=new Map(cards.map(c=>[c.id,c]));let fairness=policy(tiers.flatMap(tier=>cards.filter(c=>c.r===tier).slice(0,2).map(c=>c.id))),resets=0,releases=0;
 for(const helper of ['usesDraftHistory','usesCardCycleHistory','usesRarityCardCycleHistory','isClassicRulesVersion'])assert.equal(engine[helper](newVersion),true);
 for(const invalidSeed of [undefined,'bad',seed(0).toUpperCase()])assert.throws(()=>engine.createClassicSession(invalidSeed,[],newVersion),/seed/i);
 for(let i=0;i<500;i++){
  const draftSeed=seed(pool+'-'+i),before=plain(fairness),old=previous.createClassicSession(draftSeed,[],oldVersion,fairness),fresh=engine.createClassicSession(draftSeed,[],newVersion,fairness),events=[];
  assert.deepEqual(fresh.draft,old.draft,'Same seed and history must produce exactly the old captain board');
  const apply=event=>{old.apply(event);fresh.apply(event);events.push(event);assert.deepEqual(fresh.draft,old.draft,'Difficulty must not change any card, state or ordered history event');};
  apply({type:'captain',cardId:highest(fresh.draft.captain).id});
  for(const slot of ['B1','B2','B3','C','PF','SF','SG','PG'])if(fresh.draft.roster[slot]===null){
   apply({type:'open',slot});assert.equal(fresh.draft.opts.length,5);apply({type:'pick',cardId:highest(fresh.draft.opts).id});
  }
  assert.deepEqual(fairness,before,'Initial account history is immutable');
  const roster=fresh.draft.roster,was=previous.calculateResult(roster,oldVersion),now=engine.calculateResult(roster,newVersion);
  assert.equal(now.teamOvr,was.teamOvr);assert.equal(now.chemistry,was.chemistry);
  const starters=engine.STARTER_SLOTS.map(slot=>byId.get(roster[slot]).o),bench=engine.BENCH_SLOTS.map(slot=>byId.get(roster[slot]).o);
  const base=starters.reduce((sum,o)=>sum+Math.max(60,o),0)/5*.70+bench.reduce((sum,o)=>sum+Math.max(60,o),0)/3*.30;
  const raw=base+was.chemistry*2.10,min=Math.min(...starters,...bench),effective=min<85?Math.min(raw,curve.gateCap):raw;
  assert.equal(now.effectiveRating,+effective.toFixed(4));assert.equal(now.projectedWins,curve.projectWins(effective));assert(now.projectedWins<=was.projectedWins);
  if(min<85){assert(now.projectedWins<=81);gatedChecks++;}
  if(was.projectedWins===82)oldPerfect++;if(now.projectedWins===82)newPerfect++;
  if(i<25){
   const transcript=[...events,{type:'arrange',roster}];
   assert.deepEqual(engine.validateTranscript(draftSeed,transcript,'draft',newVersion,fairness).result,now);
   assert.deepEqual(engine.validateTranscript(draftSeed,transcript,'draft',oldVersion,fairness).result,was);
   const forged=plain(transcript);forged[0].cardId=999999;assert.throws(()=>engine.validateTranscript(draftSeed,forged,'draft',newVersion,fairness),/offered/i);
   assert.deepEqual(engine.createClassicSession(draftSeed,plain(events),newVersion,plain(fairness)).draft,fresh.draft,'Serialized replay retains offers and cycles');
  }
  resets+=fresh.draft.cardCycle.events.filter(e=>e.type==='reset').length;releases+=fresh.draft.cardCycle.events.filter(e=>e.type==='release').length;
  fairness=policy(Object.values(fresh.draft.cardCycle.shown).flat());
 }
 assert(resets>10&&releases>0,'Exercise actual cycle resets and positional scarcity across consecutive drafts');
 console.log(`${pool}: 500 identical old/new draft offer sequences and histories; ${resets} resets, ${releases} scarcity releases`);
}
assert(gatedChecks>100,'Check the existing below-85 perfection gate on many real rosters');

// An isolated alternate-anchor fixture proves neither engine has retained a
// hard-coded 103.6 projection or gate. This is a test value, not a release tune.
const alternate=vm.createContext({CARDS:modern,DUOS:modernDuos});
vm.runInContext(helperSource.replace(/const UPPER_ANCHOR = [^;]+;/,'const UPPER_ANCHOR = 106;'),alternate);
const source=read('../supabase/functions/_shared/classic-difficulty-20261010/modern-engine.js');
vm.runInContext(source.replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+';globalThis.score=calculateResult;',alternate);
const close={PG:47,SG:107,SF:258,PF:268,C:4,B1:89,B2:1077,B3:52};
assert.equal(previous.calculateResult(close,'atu-classic-v14').projectedWins,82);assert.equal(alternate.score(close).projectedWins,81,'An unchanged near-boundary roster responds to the helper tune');
const strong={PG:7,SG:0,SF:40,PF:179,C:249,B1:39,B2:758,B3:46},weakBench={...strong,B3:158};
assert.equal(alternate.score(strong).projectedWins,82);assert.equal(alternate.score(weakBench).projectedWins,81,'A high-chemistry squad still cannot carry a sub-85 card into perfection');
assert.equal(alternate.score(weakBench).effectiveRating,+alternate.ATUClassicWinCurveV1.gateCap.toFixed(4),'The engine gates against its actual shared curve boundary');
assert.equal(curve.upperAnchor,globalThis.ATUClassicWinCurveV1.upperAnchor,'Alternate test realm must not mutate the real helper');
console.log(`Classic difficulty engine tests passed: 70,001 monotonic/lower-curve checks, synchronous helper parity, frozen fingerprints, 1,000 unchanged acquisition histories, gate/replay validation; ${oldPerfect} old and ${newPerfect} new perfect rosters in this regression policy (not calibration).`);
