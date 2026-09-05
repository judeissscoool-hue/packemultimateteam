import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  ALL_SLOTS,
  BOARD_SLOTS,
  ENGINE_VERSION,
  TIER_LIMITS,
  calculateResult,
  createDraftManifest,
  createPackManifest,
  createRunManifest,
  publicCard,
  validateTranscript
} from "../supabase/functions/_shared/atu-engine-v1.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function tierAllowed(cardId, counts) {
  const card = publicCard(cardId);
  return !TIER_LIMITS[card.tier] || (counts[card.tier] || 0) < TIER_LIMITS[card.tier];
}

function validTranscript(seed, mode = "draft") {
  const manifest = createRunManifest(seed, mode);
  const counts = {};
  const captainId = manifest.captain[0];
  const captain = publicCard(captainId);
  counts[captain.tier] = 1;
  const selected = [captainId];
  const events = [{ type: "captain", cardId: captainId }];
  for (const board of manifest.boards) {
    const cardId = board.cards.find(id => tierAllowed(id, counts));
    assert.ok(Number.isInteger(cardId), `No legal choice on ${board.slot}`);
    const card = publicCard(cardId);
    counts[card.tier] = (counts[card.tier] || 0) + 1;
    selected.push(cardId);
    events.push({ type: "pick", board: board.slot, cardId });
  }
  const roster = {
    PG: selected[1],
    SG: selected[2],
    SF: selected[3],
    PF: selected[4],
    C: selected[5],
    B1: selected[6],
    B2: selected[7],
    B3: selected[0]
  };
  events.push({ type: "arrange", roster });
  return events;
}

const seed = "0123456789abcdef".repeat(4);
assert.equal(ENGINE_VERSION, "atu-challenge-v3");
const first = createDraftManifest(seed);
const second = createDraftManifest(seed);
assert.deepEqual(first, second);
assert.equal(first.engineVersion, ENGINE_VERSION);
assert.deepEqual(first.boards.map(board => board.slot), BOARD_SLOTS);

for (let i = 0; i < 50; i++) {
  const currentSeed = i.toString(16).padStart(64, "0");
  const manifest = createDraftManifest(currentSeed);
  assert.equal(manifest.captain.length, 3);
  assert.ok(manifest.captain.every(id => ["Icon", "Elite"].includes(publicCard(id).tier)));
  assert.equal(manifest.boards.length, 7);
  assert.ok(manifest.boards.every(board => board.cards.length === 5));
  assert.ok(manifest.boards.every(board => board.cards.some(id => ["Bronze", "Silver"].includes(publicCard(id).tier))));
  const allIds = [...manifest.captain, ...manifest.boards.flatMap(board => board.cards)];
  const allNames = allIds.map(id => publicCard(id).name);
  assert.equal(new Set(allNames).size, allNames.length);

  const packManifest = createPackManifest(currentSeed);
  assert.equal(packManifest.mode, "pack");
  assert.equal(packManifest.captain.length, 3);
  assert.equal(packManifest.boards.length, 7);
  assert.ok(packManifest.boards.every(board => board.cards.length === 3));
  assert.equal(packManifest.boards.filter(board => board.pack === "premium").length, 3);
  assert.ok(packManifest.boards.every(board => board.cards.some(id => ["Bronze", "Silver"].includes(publicCard(id).tier))));
  const packIds = [...packManifest.captain, ...packManifest.boards.flatMap(board => board.cards)];
  const packNames = packIds.map(id => publicCard(id).name);
  assert.equal(new Set(packNames).size, packNames.length);
}

const transcript = validTranscript(seed);
const validated = validateTranscript(seed, transcript);
assert.deepEqual(Object.keys(validated.roster), ALL_SLOTS);
assert.ok(validated.result.teamOvr >= 60 && validated.result.teamOvr <= 99);
assert.ok(validated.result.projectedWins >= 12 && validated.result.projectedWins <= 82);
assert.ok(validated.result.score >= 0 && validated.result.score <= 1000000);
assert.deepEqual(validateTranscript(seed, transcript).result, validated.result);

const cards = Array.from({ length: 2000 }, (_, id) => publicCard(id)).filter(Boolean);
const highStarters = {};
const usedHighIds = new Set();
for (const slot of ["PG", "SG", "SF", "PF", "C"]) {
  const card = cards.find(candidate => candidate.ovr >= 90 && candidate.positions.includes(slot) && !usedHighIds.has(candidate.id));
  assert.ok(card, `No high-rated ${slot} found for bench chemistry test`);
  highStarters[slot] = card.id;
  usedHighIds.add(card.id);
}
const highBench = cards.filter(card => card.ovr >= 90 && !usedHighIds.has(card.id)).slice(0, 3);
const lowBench = cards.filter(card => card.ovr <= 75 && !usedHighIds.has(card.id)).slice(0, 3);
assert.equal(highBench.length, 3);
assert.equal(lowBench.length, 3);
const rosterWithBench = bench => ({
  ...highStarters,
  B1: bench[0].id,
  B2: bench[1].id,
  B3: bench[2].id
});
assert.equal(
  calculateResult(rosterWithBench(highBench)).chemistry,
  calculateResult(rosterWithBench(lowBench)).chemistry,
  "Bench ratings must not add chemistry"
);

const packTranscript = validTranscript(seed, "pack");
const validatedPack = validateTranscript(seed, packTranscript, "pack");
assert.equal(validatedPack.manifest.mode, "pack");
assert.ok(validatedPack.result.score >= 0 && validatedPack.result.score <= 1000000);
assert.throws(() => validateTranscript(seed, packTranscript, "draft"), /not offered/);

const fakePick = structuredClone(transcript);
fakePick[1].cardId = 999999;
assert.throws(() => validateTranscript(seed, fakePick), /not offered/);

const fakeRoster = structuredClone(transcript);
fakeRoster[8].roster.PG = fakeRoster[8].roster.B1;
assert.throws(() => validateTranscript(seed, fakeRoster), /does not match drafted cards|duplicate/);

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const logic = html.match(/<script>\s*\/\/<LOGIC>([\s\S]*?)\/\/<\/LOGIC>\s*<\/script>/);
assert.ok(logic, "Canonical game logic block missing");
const context = vm.createContext({ console, Math, Object, Array, Set, Map, JSON });
vm.runInContext(`${logic[1]}\n;globalThis.__score=(roster)=>{const o=calculateTeamOVR(roster);const p=updateProjectedRecord(o.eff);return {teamOvr:o.total,projectedWins:p.wins,chemistry:o.chem.bonus};};`, context);
const canonical = context.__score(validated.roster);
assert.equal(validated.result.teamOvr, canonical.teamOvr);
assert.equal(validated.result.projectedWins, canonical.projectedWins);
assert.equal(validated.result.chemistry, canonical.chemistry);

console.log("challenge engine tests passed");
