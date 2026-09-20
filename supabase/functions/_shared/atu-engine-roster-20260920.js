import * as septemberModern from './roster-20260919/modern-engine.js';
import * as septemberHistory from './roster-20260919/history-engine.js';
import * as septemberPreview from './roster-20260919/preview.js';
import * as priorModern from './gmm-20260913/modern-engine.js';
import * as priorHistory from './gmm-20260913/history-engine.js';
import * as priorPreview from './gmm-20260913/preview.js';
// Versioned rules preserve saved runs when the roster changes.
import * as previousModern from './gmm-20260916/modern-engine.js';
import * as previousHistory from './gmm-20260916/history-engine.js';
import * as previousPreview from './gmm-20260916/preview.js';
import * as modern from './roster-20260920/modern-engine.js';
import * as history from './roster-20260920/history-engine.js';
import * as legacy from './legacy/atu-engine-v1.js';
import * as legacyPreview from './legacy/preview.js';
export const ENGINE_VERSION = modern.ENGINE_VERSION;
export const RULES_VERSION = legacy.RULES_VERSION;
export const CLASSIC_RULES_VERSION = modern.CLASSIC_RULES_VERSION;
export const PACK_RULES_VERSION = modern.PACK_RULES_VERSION;
export const {STARTER_SLOTS,BENCH_SLOTS,ALL_SLOTS,BOARD_SLOTS,TIER_LIMITS} = modern;
const engines = new Map([
 ...[septemberModern.CLASSIC_RULES_VERSION,septemberModern.PACK_RULES_VERSION].map(v=>[v,septemberModern]),
 ...[septemberHistory.CLASSIC_RULES_VERSION,septemberHistory.PACK_RULES_VERSION].map(v=>[v,septemberHistory]),
  ...[previousModern.CLASSIC_RULES_VERSION,previousModern.PACK_RULES_VERSION].map(v=>[v,previousModern]),
  ...[previousHistory.CLASSIC_RULES_VERSION,previousHistory.PACK_RULES_VERSION].map(v=>[v,previousHistory]),
  ...[priorModern.CLASSIC_RULES_VERSION,priorModern.PACK_RULES_VERSION].map(v=>[v,priorModern]),
  ...[priorHistory.CLASSIC_RULES_VERSION,priorHistory.PACK_RULES_VERSION].map(v=>[v,priorHistory]),
  ...[legacy.RULES_VERSION,legacy.CLASSIC_RULES_VERSION,legacy.PACK_RULES_VERSION].map(v=>[v,legacy]),
  ...[modern.CLASSIC_RULES_VERSION,modern.PACK_RULES_VERSION].map(v=>[v,modern]),
  ...[history.CLASSIC_RULES_VERSION,history.PACK_RULES_VERSION].map(v=>[v,history])
]);
export const SUPPORTED_RULES_VERSIONS = Object.freeze([...engines.keys()]);
export function getEngineForRules(version) {
  const engine=engines.get(version);
  if(!engine) throw new Error('Unsupported ruleset: '+version);
  return engine;
}
export function isClassicRulesVersion(version) {
  return [legacy,priorModern,priorHistory,previousModern,previousHistory,septemberModern,septemberHistory,modern,history].some(e=>e.CLASSIC_RULES_VERSION===version);
}
export function isLegacyRulesVersion(version) { return engines.get(version)===legacy; }
export function legacyView(version) { return isLegacyRulesVersion(version)?legacyPreview:[priorModern,priorHistory].includes(engines.get(version))?priorPreview:[previousModern,previousHistory].includes(engines.get(version))?previousPreview:[septemberModern,septemberHistory].includes(engines.get(version))?septemberPreview:null; }
export function rulesForPool(pool,mode) {
  if(!['modern','history'].includes(pool)||!['draft','pack'].includes(mode)) throw new Error('Invalid player pool or mode');
  const engine=pool==='history'?history:modern;
  return mode==='draft'?engine.CLASSIC_RULES_VERSION:engine.PACK_RULES_VERSION;
}
function poolForRules(version) { return [history,priorHistory,previousHistory,septemberHistory].includes(engines.get(version))?'history':engines.get(version)===legacy?'legacy':'modern'; }
export function createClassicSession(seed,events=[],version=CLASSIC_RULES_VERSION,fairness=null) {
  const session=getEngineForRules(version).createClassicSession(seed,events,fairness);
  session.draft.cardPool=poolForRules(version);
  return session;
}
export function createClassicPackSession(seed,events=[],version=PACK_RULES_VERSION) {
  const session=getEngineForRules(version).createClassicPackSession(seed,events);
  session.pack.cardPool=poolForRules(version);
  return session;
}
export function calculateResult(roster,version=CLASSIC_RULES_VERSION) { return getEngineForRules(version).calculateResult(roster); }
export function validateTranscript(seed,transcript,mode='draft',version=RULES_VERSION,fairness=null) { return getEngineForRules(version).validateTranscript(seed,transcript,mode,version,fairness); }
export function publicCard(id,version=CLASSIC_RULES_VERSION) { return getEngineForRules(version).publicCard(id); }
// The original board-manifest API belongs to atu-v1 saved challenges.
export const {createDraftManifest,createPackManifest,createRunManifest} = legacy;
