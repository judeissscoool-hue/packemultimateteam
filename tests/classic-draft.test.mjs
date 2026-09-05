import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createClassicSession,validateTranscript,CLASSIC_RULES_VERSION,ALL_SLOTS,publicCard} from '../supabase/functions/_shared/atu-engine-v1.js';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const logic=html.match(/<script>\s*\/\/<LOGIC>([\s\S]*?)\/\/<\/LOGIC>/)[1];
const draftCode=html.slice(html.indexOf('function activeDraft(){'),html.indexOf('/* ================= ROOT RENDER'));
const overlayCode=html.slice(html.indexOf('function renderDraftOverlay(){'),html.indexOf('function showPrivacy(){'));

// Run the real click handlers and renderer against both Classic Draft and an online session.
const nodes=new Map();
const $=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',classList:{add(){},remove(){}}});return nodes.get(id);};
const seed='0123456789abcdef'.repeat(4),session=createClassicSession(seed),events=[];
const context=vm.createContext({console,$,esc:s=>s,render(){},notice(){},closeSheet(){},confetti(){},
  cardHTML(p,attrs=''){return `<div class="card ${p.tier}" ${attrs}>${p.name}</div>`;},
  recordIdentityHTML(){return '';},nearMissHTML(){return '';},
  ATUBackend:{classicDraftState:()=>session.draft,applyClassicDraftAction(event){session.apply(event);events.push(event);return true;},classicDraftFinishHTML(){return '<button>LOCK IN MY DRAFT</button>';}}
});
vm.runInContext(logic+'\n'+html.match(/const SLOT_LABEL=.+;/)[0]+'\n'+draftCode+'\n'+overlayCode+'\nscreen="challenge";',context);
const run=source=>vm.runInContext(source,context);
function samePicker(){
  run('renderDraftOverlay()');const online=$('#draftoverlay').innerHTML;
  context.offline=JSON.parse(JSON.stringify(session.draft));
  run('D=offline;screen="draft";renderDraftOverlay()');
  assert.equal($('#draftoverlay').innerHTML,online,'Both modes must render the identical card picker and handlers');
  run('screen="challenge"');
}
samePicker();
const captain=session.draft.captain[0];
run(`pickCaptain(${captain.id})`);
assert.equal(session.draft.roster[captain.pos],captain.id,'Captain starts at their natural position');
assert.equal(session.draft.roster.B3,null);
assert.doesNotMatch(run('draftHTML()'),/slotlocked/,'All empty positions start available');
run("draftSlotTap('B3')");
const offers=session.draft.opts.map(p=>p.id);
samePicker();
run('closeDraftPick()');
const other=ALL_SLOTS.find(s=>s!=='B3'&&session.draft.roster[s]==null);
run(`draftSlotTap('${other}')`);
assert.equal(session.draft.activeSlot,null,'Closing options retains the original pending pick');
run("draftSlotTap('B3')");
assert.deepEqual(session.draft.opts.map(p=>p.id),offers,'Returning never rerolls the board');
run(`draftPickInto(${offers[0]})`);
assert.doesNotMatch(run('draftHTML()'),/slotlocked/,'The next position is free after choosing a card');
for(const slot of [...ALL_SLOTS].reverse())if(session.draft.roster[slot]==null){
  run(`draftSlotTap('${slot}')`);run(`draftPickInto(${session.draft.opts[0].id})`);
}
assert.ok(session.draft.done);
const legal=(id,slot)=>slot.startsWith('B')||publicCard(id).positions.includes(slot);
const from=ALL_SLOTS.find(a=>ALL_SLOTS.some(b=>a!==b&&legal(session.draft.roster[a],b)&&legal(session.draft.roster[b],a)));
const to=ALL_SLOTS.find(b=>b!==from&&legal(session.draft.roster[from],b)&&legal(session.draft.roster[b],from));
run(`openDraftSwap('${from}')`);const onlineSwap=$('#sheet').innerHTML;
context.offline=JSON.parse(JSON.stringify(session.draft));run(`D=offline;screen="draft";openDraftSwap('${from}')`);
assert.equal($('#sheet').innerHTML,onlineSwap,'Both modes use the identical legal-move menu');
run('screen="challenge"');
const before=session.draft.roster[from];run(`doDraftSwap('${from}','${to}')`);assert.equal(session.draft.roster[to],before);
assert.match(run('draftHTML()'),/LOCK IN MY DRAFT/);
const transcript=[...events,{type:'arrange',roster:{...session.draft.roster}}];
assert.deepEqual(validateTranscript(seed,transcript,'one_v_one',CLASSIC_RULES_VERSION).roster,session.draft.roster);
assert.deepEqual(createClassicSession(seed,events).draft.roster,session.draft.roster,'Reload preserves picks and swaps');
const fake=structuredClone(transcript);fake[1].slot=captain.pos;
assert.throws(()=>validateTranscript(seed,fake,'one_v_one',CLASSIC_RULES_VERSION),/Invalid draft slot/);
const forged=structuredClone(transcript);forged.at(-1).roster[from]=forged.at(-1).roster[to];
assert.throws(()=>validateTranscript(seed,forged,'one_v_one',CLASSIC_RULES_VERSION),/Final roster/);
assert.throws(()=>validateTranscript(seed,transcript,'one_v_one','atu-v1'),/exactly nine/,'Rules are bound to the server run');
console.log('Classic Draft / duel gameplay and picker parity passed');
