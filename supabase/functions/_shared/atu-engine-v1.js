// Versioned rules preserve saved runs when the roster changes.
import * as modern from './gmm-20260913/modern-engine.js';
import * as history from './gmm-20260913/history-engine.js';
import * as legacy from './legacy/atu-engine-v1.js';
import * as legacyPreview from './legacy/preview.js';
export const ENGINE_VERSION = modern.ENGINE_VERSION;
export const RULES_VERSION = legacy.RULES_VERSION;
export const CLASSIC_RULES_VERSION = modern.CLASSIC_RULES_VERSION;
export const PACK_RULES_VERSION = modern.PACK_RULES_VERSION;
export const {STARTER_SLOTS,BENCH_SLOTS,ALL_SLOTS,BOARD_SLOTS,TIER_LIMITS} = modern;
const engines = new Map([
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
  return [legacy,modern,history].some(e=>e.CLASSIC_RULES_VERSION===version);
}
export function isLegacyRulesVersion(version) { return engines.get(version)===legacy; }
export function legacyView(version) { return isLegacyRulesVersion(version)?legacyPreview:null; }
export function rulesForPool(pool,mode) {
  if(!['modern','history'].includes(pool)||!['draft','pack'].includes(mode)) throw new Error('Invalid player pool or mode');
  const engine=pool==='history'?history:modern;
  return mode==='draft'?engine.CLASSIC_RULES_VERSION:engine.PACK_RULES_VERSION;
}
function poolForRules(version) { return engines.get(version)===history?'history':engines.get(version)===legacy?'legacy':'modern'; }
export function createClassicSession(seed,events=[],version=CLASSIC_RULES_VERSION) {
  const session=getEngineForRules(version).createClassicSession(seed,events);
  session.draft.cardPool=poolForRules(version);
  return session;
}
export function createClassicPackSession(seed,events=[],version=PACK_RULES_VERSION) {
  const session=getEngineForRules(version).createClassicPackSession(seed,events);
  session.pack.cardPool=poolForRules(version);
  return session;
}
export function calculateResult(roster,version=CLASSIC_RULES_VERSION) { return getEngineForRules(version).calculateResult(roster); }
export function validateTranscript(seed,transcript,mode='draft',version=RULES_VERSION) { return getEngineForRules(version).validateTranscript(seed,transcript,mode,version); }
export function publicCard(id,version=CLASSIC_RULES_VERSION) { return getEngineForRules(version).publicCard(id); }
// The original board-manifest API belongs to atu-v1 saved challenges.
export const {createDraftManifest,createPackManifest,createRunManifest} = legacy;
