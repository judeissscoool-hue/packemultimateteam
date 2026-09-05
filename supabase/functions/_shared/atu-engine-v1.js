import { CARDS, DUOS } from "./atu-data-v1.js";

export const ENGINE_VERSION = "atu-challenge-v2";
export const RULES_VERSION = "atu-v1";
export const STARTER_SLOTS = Object.freeze(["PG", "SG", "SF", "PF", "C"]);
export const BENCH_SLOTS = Object.freeze(["B1", "B2", "B3"]);
export const ALL_SLOTS = Object.freeze([...STARTER_SLOTS, ...BENCH_SLOTS]);
export const BOARD_SLOTS = Object.freeze(["PG", "SG", "SF", "PF", "C", "B1", "B2"]);
export const TIER_LIMITS = Object.freeze({ Icon: 2, Elite: 4 });

const CARD_BY_ID = new Map(CARDS.map(card => [card.id, card]));
const DRAFT_POOL = CARDS.filter(card => card.w > 0.15);
const TIER_ORDER = ["Bronze", "Silver", "Gold", "Elite", "Icon"];
const DRAFT_ODDS = Object.freeze({ Bronze: 0.14, Silver: 0.40, Gold: 0.40, Elite: 0.04, Icon: 0.02 });
const PACK_ODDS = Object.freeze({ Bronze: 0.18, Silver: 0.42, Gold: 0.34, Elite: 0.05, Icon: 0.01 });
const PREMIUM_PACK_ODDS = Object.freeze({ Bronze: 0.04, Silver: 0.24, Gold: 0.54, Elite: 0.15, Icon: 0.03 });
const CORE_STEP = [0, 0, 1.35, 2.5, 3.45, 4.0];
const DUO_WEIGHT = 0.5;
const CHEM_WIN_MULT = 2.10;
const EIGHTY_TWO_EFF = 103.1;
const PERFECT_MIN_OVR = 85;
const PROJECTION_POINTS = [[60,15],[70,26],[75,31],[80,38],[84,46],[87,54],[90,65],[92,70],[95,76],[97,78],[100,80],[EIGHTY_TWO_EFF,82]];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hashSeed(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return h >>> 0;
}

function seededRandom(seed) {
  assert(typeof seed === "string" && /^[a-f0-9]{64}$/.test(seed), "Invalid draft seed");
  let a = hashSeed(seed.slice(0, 16));
  let b = hashSeed(seed.slice(16, 32));
  let c = hashSeed(seed.slice(32, 48));
  let d = hashSeed(seed.slice(48, 64));
  return function random() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b + d) >>> 0;
    d = (d + 1) >>> 0;
    a = (b ^ (b >>> 9)) >>> 0;
    b = (c + (c << 3)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    c = (c + t) >>> 0;
    return t / 4294967296;
  };
}

function tierRoll(random, odds = DRAFT_ODDS) {
  let roll = random();
  for (const tier of TIER_ORDER) {
    roll -= odds[tier];
    if (roll < 0) return tier;
  }
  return "Gold";
}

function eligible(card, slot) {
  return BENCH_SLOTS.includes(slot) || card.ps.includes(slot);
}

function weightedNamePick(pool, usedNames, random) {
  const byName = new Map();
  for (const card of pool) {
    if (usedNames.has(card.n)) continue;
    if (!byName.has(card.n)) byName.set(card.n, []);
    byName.get(card.n).push(card);
  }
  const groups = [...byName.entries()];
  if (!groups.length) return null;
  const weights = groups.map(([, cards]) => Math.sqrt(Math.max(0.01, cards[0].w || 1)));
  let target = random() * weights.reduce((sum, weight) => sum + weight, 0);
  let selected = groups[groups.length - 1][1];
  for (let i = 0; i < groups.length; i++) {
    target -= weights[i];
    if (target < 0) { selected = groups[i][1]; break; }
  }
  return selected[Math.floor(random() * selected.length)];
}

function takeCard(pool, usedNames, random) {
  const card = weightedNamePick(pool, usedNames, random);
  assert(card, "Draft pool exhausted");
  usedNames.add(card.n);
  return card;
}

function captainBoard(usedNames, random) {
  const cards = [];
  for (let i = 0; i < 3; i++) {
    const preferred = random() < 0.5 ? "Icon" : "Elite";
    let pool = DRAFT_POOL.filter(card => card.r === preferred);
    if (!pool.some(card => !usedNames.has(card.n))) {
      pool = DRAFT_POOL.filter(card => card.r === (preferred === "Icon" ? "Elite" : "Icon"));
    }
    cards.push(takeCard(pool, usedNames, random));
  }
  return cards.map(card => card.id);
}

function optionBoard(slot, usedNames, random, size = 5, odds = DRAFT_ODDS) {
  const cards = [];
  for (let i = 0; i < size; i++) {
    const tier = tierRoll(random, odds);
    let pool = DRAFT_POOL.filter(card => card.r === tier && eligible(card, slot));
    if (!pool.some(card => !usedNames.has(card.n))) {
      pool = DRAFT_POOL.filter(card => eligible(card, slot));
    }
    cards.push(takeCard(pool, usedNames, random));
  }
  if (!cards.some(card => card.r === "Bronze" || card.r === "Silver")) {
    const lowPool = DRAFT_POOL.filter(card => eligible(card, slot) && (card.r === "Bronze" || card.r === "Silver"));
    const replacement = weightedNamePick(lowPool, usedNames, random);
    if (replacement) {
      usedNames.delete(cards[size - 1].n);
      usedNames.add(replacement.n);
      cards[size - 1] = replacement;
    }
  }
  return cards.map(card => card.id);
}

export function createDraftManifest(seed) {
  const random = seededRandom(seed);
  const usedNames = new Set();
  const captain = captainBoard(usedNames, random);
  const boards = BOARD_SLOTS.map(slot => ({
    slot,
    cards: optionBoard(slot, usedNames, random)
  }));
  return Object.freeze({
    engineVersion: ENGINE_VERSION,
    rulesVersion: RULES_VERSION,
    mode: "draft",
    captain,
    boards
  });
}

export function createPackManifest(seed) {
  const random = seededRandom(seed);
  const usedNames = new Set();
  const captain = captainBoard(usedNames, random);
  const premiumBoards = new Set([1, 4, 6]);
  const boards = BOARD_SLOTS.map((slot, index) => ({
    slot,
    pack: premiumBoards.has(index) ? "premium" : "standard",
    cards: optionBoard(slot, usedNames, random, 3, premiumBoards.has(index) ? PREMIUM_PACK_ODDS : PACK_ODDS)
  }));
  return Object.freeze({
    engineVersion: ENGINE_VERSION,
    rulesVersion: RULES_VERSION,
    mode: "pack",
    captain,
    boards
  });
}

export function createRunManifest(seed, mode = "draft") {
  assert(mode === "draft" || mode === "pack" || mode === "one_v_one", "Unsupported run mode");
  return mode === "pack" ? createPackManifest(seed) : createDraftManifest(seed);
}

function duoBonus(starters) {
  const names = new Set(starters.map(card => card.n));
  const groups = DUOS.map(group => ({
    members: group.m.filter(name => names.has(name))
  })).filter(group => group.members.length >= 2)
    .sort((a, b) => b.members.length - a.members.length);
  let total = 0;
  const credited = [];
  for (const group of groups) {
    if (credited.some(larger => group.members.every(name => larger.has(name)))) continue;
    total += (group.members.length - 1) * DUO_WEIGHT;
    credited.push(new Set(group.members));
  }
  return total;
}

function chemistry(roster) {
  const starters = STARTER_SLOTS.map(slot => CARD_BY_ID.get(roster[slot]));
  const teamCounts = {};
  for (const card of starters) teamCounts[card.t] = (teamCounts[card.t] || 0) + 1;
  let team = 0;
  for (const count of Object.values(teamCounts)) {
    if (count >= 2) team += CORE_STEP[Math.min(5, count)];
  }
  team = Math.min(CORE_STEP[5], team);

  const tagGroups = new Map();
  for (const card of starters) {
    for (const tag of card.g) {
      if (!tagGroups.has(tag)) tagGroups.set(tag, new Set());
      tagGroups.get(tag).add(card.n);
    }
  }
  let tags = 0;
  for (const [tag, names] of tagGroups) {
    if (names.size < 2) continue;
    const weight = tag.startsWith("Story_") ? 0.4 : 0.25;
    tags += +((names.size - 1) * weight).toFixed(1);
  }
  tags = Math.min(4.5, tags + duoBonus(starters));
  return +Math.min(10, team + tags).toFixed(1);
}

function projectWins(effectiveRating) {
  const rating = Math.max(60, Math.min(EIGHTY_TWO_EFF, effectiveRating));
  let wins = PROJECTION_POINTS[PROJECTION_POINTS.length - 1][1];
  for (let i = 0; i < PROJECTION_POINTS.length - 1; i++) {
    const [a, winsA] = PROJECTION_POINTS[i];
    const [b, winsB] = PROJECTION_POINTS[i + 1];
    if (rating <= b) {
      const progress = (rating - a) / (b - a);
      const eased = (1 - Math.cos(Math.PI * progress)) / 2;
      wins = Math.round(winsA + (winsB - winsA) * eased);
      break;
    }
  }
  return Math.max(12, Math.min(82, wins));
}

let perfectGateCap;
function getPerfectGateCap() {
  if (perfectGateCap !== undefined) return perfectGateCap;
  let low = 60;
  let high = EIGHTY_TWO_EFF;
  for (let i = 0; i < 80; i++) {
    const midpoint = (low + high) / 2;
    if (projectWins(midpoint) >= 82) high = midpoint;
    else low = midpoint;
  }
  perfectGateCap = low;
  return perfectGateCap;
}

export function calculateResult(roster) {
  assert(roster && typeof roster === "object" && !Array.isArray(roster), "Invalid final roster");
  const ids = ALL_SLOTS.map(slot => roster[slot]);
  assert(ids.every(Number.isInteger), "Final roster must fill all eight slots");
  assert(new Set(ids).size === ALL_SLOTS.length, "Final roster contains duplicate cards");
  const cards = ids.map(id => CARD_BY_ID.get(id));
  assert(cards.every(Boolean), "Final roster contains an unknown card");
  STARTER_SLOTS.forEach(slot => assert(eligible(CARD_BY_ID.get(roster[slot]), slot), `Card is not eligible at ${slot}`));

  const starters = STARTER_SLOTS.map(slot => CARD_BY_ID.get(roster[slot]).o);
  const bench = BENCH_SLOTS.map(slot => CARD_BY_ID.get(roster[slot]).o);
  const base = (starters.reduce((sum, value) => sum + Math.max(60, value), 0) / 5) * 0.70
    + (bench.reduce((sum, value) => sum + Math.max(60, value), 0) / 3) * 0.30;
  const chem = chemistry(roster);
  const teamOvr = Math.max(60, Math.min(99, Math.round(base + chem)));
  const minimumOvr = Math.min(...cards.map(card => card.o));
  let effectiveRating = base + chem * CHEM_WIN_MULT;
  if (minimumOvr < PERFECT_MIN_OVR) effectiveRating = Math.min(effectiveRating, getPerfectGateCap());
  const projectedWins = projectWins(effectiveRating);
  const score = projectedWins * 10000 + teamOvr * 100 + Math.round(chem * 10);
  assert(score <= 1000000, "Calculated score exceeds server limits");
  return Object.freeze({
    teamOvr,
    projectedWins,
    chemistry: chem,
    effectiveRating: +effectiveRating.toFixed(4),
    score
  });
}

function selectedTierCounts(cards) {
  const counts = {};
  for (const card of cards) counts[card.r] = (counts[card.r] || 0) + 1;
  return counts;
}

export function validateTranscript(seed, transcript, mode = "draft") {
  assert(Array.isArray(transcript) && transcript.length === 9, "Transcript must contain exactly nine events");
  const manifest = createRunManifest(seed, mode);
  const captainEvent = transcript[0];
  assert(captainEvent && captainEvent.type === "captain" && Number.isInteger(captainEvent.cardId), "Invalid captain event");
  assert(manifest.captain.includes(captainEvent.cardId), "Captain was not offered");

  const selectedIds = [captainEvent.cardId];
  for (let i = 0; i < BOARD_SLOTS.length; i++) {
    const event = transcript[i + 1];
    const board = manifest.boards[i];
    assert(event && event.type === "pick" && event.board === board.slot && Number.isInteger(event.cardId), `Invalid ${board.slot} pick`);
    assert(board.cards.includes(event.cardId), `Selected card was not offered on ${board.slot}`);
    selectedIds.push(event.cardId);
  }

  const selectedCards = selectedIds.map(id => CARD_BY_ID.get(id));
  assert(selectedCards.every(Boolean), "Transcript contains an unknown card");
  assert(new Set(selectedCards.map(card => card.n)).size === selectedCards.length, "A player name was selected more than once");
  const tiers = selectedTierCounts(selectedCards);
  for (const [tier, limit] of Object.entries(TIER_LIMITS)) {
    assert((tiers[tier] || 0) <= limit, `${tier} selection limit exceeded`);
  }

  const arrangeEvent = transcript[8];
  assert(arrangeEvent && arrangeEvent.type === "arrange", "Missing final arrangement");
  const roster = arrangeEvent.roster;
  assert(roster && typeof roster === "object" && !Array.isArray(roster), "Invalid final arrangement");
  assert(Object.keys(roster).length === ALL_SLOTS.length && ALL_SLOTS.every(slot => Object.prototype.hasOwnProperty.call(roster, slot)), "Final arrangement has invalid slots");
  const rosterIds = ALL_SLOTS.map(slot => roster[slot]);
  assert(rosterIds.every(Number.isInteger), "Final arrangement must fill all slots");
  assert([...rosterIds].sort((a, b) => a - b).join(",") === [...selectedIds].sort((a, b) => a - b).join(","), "Final roster does not match drafted cards");

  const result = calculateResult(roster);
  const normalizedRoster = Object.fromEntries(ALL_SLOTS.map(slot => [slot, roster[slot]]));
  return Object.freeze({ manifest, roster: normalizedRoster, result });
}

export function publicCard(cardId) {
  const card = CARD_BY_ID.get(cardId);
  if (!card) return null;
  return Object.freeze({
    id: card.id,
    name: card.n,
    position: card.p,
    positions: [...card.ps],
    ovr: card.o,
    team: card.t,
    tier: card.r
  });
}
