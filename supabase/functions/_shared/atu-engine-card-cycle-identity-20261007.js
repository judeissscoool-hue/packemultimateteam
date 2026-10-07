import * as previous from './atu-engine-card-cycle-rarity-20261003.js';
import * as modern from './card-cycle-identity-20261007/modern-engine.js';
import * as history from './card-cycle-identity-20261007/history-engine.js';
export * from './atu-engine-card-cycle-rarity-20261003.js';
export const ENGINE_VERSION='atu-card-cycle-identity-v1';
export const CLASSIC_RULES_VERSION=modern.CLASSIC_RULES_VERSION;
const current=new Map([[modern.CLASSIC_RULES_VERSION,modern],[history.CLASSIC_RULES_VERSION,history]]);
export const SUPPORTED_RULES_VERSIONS=Object.freeze([...previous.SUPPORTED_RULES_VERSIONS,...current.keys()]);
export function getEngineForRules(v){return current.get(v)||previous.getEngineForRules(v);}
export function isClassicRulesVersion(v){return current.has(v)||previous.isClassicRulesVersion(v);}
export function usesRarityCardCycleHistory(v){return current.has(v)||previous.usesRarityCardCycleHistory(v);}
export function usesCardCycleHistory(v){return current.has(v)||previous.usesCardCycleHistory(v);}
export function usesDraftHistory(v){return current.has(v)||previous.usesDraftHistory(v);}
export function isLegacyRulesVersion(v){return !current.has(v)&&previous.isLegacyRulesVersion(v);}
export function legacyView(v){return current.has(v)?null:previous.legacyView(v);}
export function rulesForPool(pool,mode){
 if(!['modern','history'].includes(pool)||!['draft','pack'].includes(mode))throw new Error('Invalid player pool or mode');
 return mode==='draft'?(pool==='history'?history:modern).CLASSIC_RULES_VERSION:previous.rulesForPool(pool,mode);
}
export function createClassicSession(seed,events=[],version=CLASSIC_RULES_VERSION,fairness=null){
 if(!current.has(version))return previous.createClassicSession(seed,events,version,fairness);
 const session=current.get(version).createClassicSession(seed,events,fairness);
 session.draft.cardPool=version===history.CLASSIC_RULES_VERSION?'history':'modern';return session;
}
export function calculateResult(roster,version=CLASSIC_RULES_VERSION){return getEngineForRules(version).calculateResult(roster);}
export function validateTranscript(seed,transcript,mode='draft',version=previous.RULES_VERSION,fairness=null){return getEngineForRules(version).validateTranscript(seed,transcript,mode,version,fairness);}
export function publicCard(id,version=CLASSIC_RULES_VERSION){return getEngineForRules(version).publicCard(id);}
