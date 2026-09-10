import assert from 'node:assert/strict';
import {createClassicPackSession,createClassicSession,validateTranscript,PACK_RULES_VERSION,CLASSIC_RULES_VERSION,ALL_SLOTS,publicCard} from '../supabase/functions/_shared/atu-engine-v1.js';
const seed='0123456789abcdef'.repeat(4);
const session=createClassicPackSession(seed),events=[];
const apply=event=>{const result=session.apply(event);events.push(event);return result;};
const captain=apply({type:'captainOpen'});
apply({type:'captain',cardId:captain[0]});
assert.throws(()=>session.apply({type:'captain',cardId:captain[1]}),/already|offered/);
for(let i=0;i<session.pack.cap;i++){
  const cards=apply({type:'pack',pack:i<3?'premium':'standard'});
  assert.equal(cards.length,3);
  assert.ok(cards.some(id=>['Bronze','Silver'].includes(publicCard(id).tier)));
}
assert.throws(()=>session.apply({type:'pack',pack:'standard'}),/budget/);
assert.equal(session.pack.premiumPacksLeft,0);
assert.ok((session.pack.tierCounts.Icon||0)<=2 && (session.pack.tierCounts.Elite||0)<=4);
assert.deepEqual(createClassicPackSession(seed,events).pack,session.pack,'Reload replays the same budget, captain and pulls');
const roster={},names=new Set();
for(const slot of ALL_SLOTS){
  const id=session.pack.ids.find(id=>!names.has(publicCard(id).name)&&(slot.startsWith('B')||publicCard(id).positions.includes(slot)));
  assert.notEqual(id,undefined);roster[slot]=id;names.add(publicCard(id).name);
}
const transcript=[...events,{type:'arrange',roster}];
assert.ok(validateTranscript(seed,transcript,'pack',PACK_RULES_VERSION).result.projectedWins>=12);
const forged=structuredClone(transcript);forged.at(-1).roster.PG=999999;
assert.throws(()=>validateTranscript(seed,forged,'pack',PACK_RULES_VERSION),/not pulled/);
assert.throws(()=>validateTranscript(seed,transcript,'draft',PACK_RULES_VERSION),/Invalid/);
const draft=createClassicSession(seed),draftEvents=[];
const draftApply=e=>{draft.apply(e);draftEvents.push(e);};
draftApply({type:'captain',cardId:draft.draft.captain[0].id});
for(const slot of ALL_SLOTS)if(draft.draft.roster[slot]==null){draftApply({type:'open',slot});draftApply({type:'pick',cardId:draft.draft.opts[0].id});}
assert.deepEqual(validateTranscript(seed,[...draftEvents,{type:'arrange',roster:draft.draft.roster}],'draft',CLASSIC_RULES_VERSION).roster,draft.draft.roster);
console.log('Normal Draft and Pack replay, budget and forgery tests passed');
