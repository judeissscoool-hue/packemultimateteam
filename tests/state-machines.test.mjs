import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { docsPath, loadMachines, renderDocs } from "../scripts/build-state-machine-docs.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const backend = read("backend.js"), page = read("index.html");
const machines = loadMachines();
const all = machines.describe();

// The registry itself: every state can be reached, unless it says otherwise.
for (const m of all) {
  const seen = new Set([m.initial]), queue = [m.initial];
  while (queue.length) {
    const current = queue.pop(), state = m.states.find(s => s.id === current);
    const next = state.to.includes(machines.ANY) ? m.states.map(s => s.id) : state.to;
    for (const id of next) if (!seen.has(id)) { seen.add(id); queue.push(id); }
  }
  for (const s of m.states) assert.equal(seen.has(s.id), !s.unreachable, `${m.name}.${s.id} reachability must match its declaration`);
}

// transition() always writes, and reports what was not declared.
{
  const fresh = loadMachines(), holder = { status: "idle" }, heard = [];
  fresh.subscribe(change => heard.push(`${change.from}>${change.to}`));
  fresh.transition("rankings", holder, "status", "loading");
  fresh.transition("rankings", holder, "status", "loading");
  assert.deepEqual(heard, ["idle>loading"], "Listeners hear real changes only");
  assert.equal(fresh.violations.length, 0);
  const warn = console.warn; let warnings = 0; console.warn = () => { warnings++; };
  try {
    fresh.transition("rankings", holder, "status", "idle");
    fresh.transition("rankings", holder, "status", "ready");
    fresh.transition("rankings", holder, "status", "idle");
    fresh.transition("rankings", holder, "status", "ready");
    assert.equal(holder.status, "ready", "An undeclared move is still applied so the player is never stranded");
    assert.equal(fresh.violations.length, 2);
    assert.equal(warnings, 1, "The same problem is logged once");
    assert.equal(fresh.coerce("screen", "shop", "landing"), "landing");
    assert.equal(fresh.coerce("screen", "rafters", "landing"), "rafters");
  } finally { console.warn = warn; }
  fresh.setStrict(true);
  assert.throws(() => fresh.transition("rankings", { status: "idle" }, "status", "nope"), /undeclared state/);
  assert.throws(() => fresh.machine("missing"), /Unknown state machine/);
}

// Derived machines.
assert.equal(machines.draftPhase({ stage: "idle" }), "idle");
assert.equal(machines.draftPhase({ stage: "captain" }), "captain");
assert.equal(machines.draftPhase({ stage: "picking", done: false }), "picking");
assert.equal(machines.draftPhase({ stage: "picking", done: true }), "complete");
assert.equal(machines.dailyPhase(null), "ready");
assert.equal(machines.dailyPhase({ done: true }), "complete");
assert.equal(machines.raftersPhase({ open: true, done: false }), "opening");
assert.equal(machines.raftersPhase({ open: true, done: true }), "revealed");
assert.equal(machines.raftersPhase({ open: false, done: false }), "sealed");

// backend.js: tracked fields change only through move(), and only to declared states.
const tracked = [/state\.challenge\.phase\s*=[^=]/, /state\.cloudStatus\s*=[^=]/, /rankings\.status\s*=[^=]/,
  /friends\.status\s*=[^=]/, /state\.authMode\s*=[^=]/, /active\.stage\s*=[^=]/, /(run|current)\.status\s*=[^=]/];
for (const pattern of tracked) assert.doesNotMatch(backend, pattern, `Use move() instead of assigning (${pattern})`);
let moves = 0;
for (const [, name, target] of backend.matchAll(/move\("(\w+)",[^;]*?,\s*"\w+",\s*([^;]+)\);/g)) {
  moves++;
  for (const [, literal] of target.matchAll(/["']([a-z_]+)["']/g))
    if (!/machines\.coerce/.test(target) || literal !== "authForm")
      assert(machines.has(name, literal), `${name} has no state "${literal}"`);
}
assert(moves >= 45, "The move() scan must keep finding the backend's state changes");
const compared = [["duel", /challenge\.phase\s*[!=]==\s*["'](\w+)["']/g], ["cloudSave", /cloudStatus\s*[!=]==\s*["'](\w+)["']/g],
  ["rankings", /rankings\.status\s*[!=]==\s*["'](\w+)["']/g], ["friends", /friends\.status\s*[!=]==\s*["'](\w+)["']/g],
  ["authForm", /authMode\s*[!=]==\s*["'](\w+)["']/g], ["duelRun", /active\.stage\s*[!=]==\s*["'](\w+)["']/g],
  ["gameRun", /run\.status\s*[!=]==\s*["'](\w+)["']/g]];
for (const [name, pattern] of compared)
  for (const [, literal] of backend.matchAll(pattern)) assert(machines.has(name, literal), `${name} is compared with undeclared "${literal}"`);
// Every duel state has its own page.
const duelPage = backend.slice(backend.indexOf("function challengeHTML()"), backend.indexOf("function cloudStatusHTML()"));
for (const s of all.find(m => m.name === "duel").states)
  if (s.id !== "idle") assert(duelPage.includes(`phase === '${s.id}'`), `challengeHTML must draw the ${s.id} state`);
// Every cloud save state has a label for the Account page.
const cloudLabels = backend.slice(backend.indexOf("function cloudStatusHTML()"), backend.indexOf("function signedOutHTML()"));
for (const s of all.find(m => m.name === "cloudSave").states) assert(new RegExp(`\\b${s.id}:`).test(cloudLabels), `cloudStatusHTML needs a label for ${s.id}`);

// Pages: every place the game can send the player is a declared screen.
const sources = [page, backend, read("ui-reboot.js")].join("\n");
const targets = new Set([...sources.matchAll(/setScreen\(\\?['"]([a-z0-9-]+)\\?['"]\)/g)].map(m => m[1]));
const nav = page.slice(page.indexOf("const TOP_NAV="), page.indexOf("function renderTopNav"));
for (const [, id] of nav.matchAll(/(?:screen:|\[)"([a-z]+)"/g)) targets.add(id);
for (const [, id] of backend.matchAll(/screen: "([a-z]+)"/g)) targets.add(id);
assert(targets.size >= 14);
for (const id of targets) assert(machines.has("screen", id), `"${id}" is not a declared screen`);
assert.match(page, /function setScreen\(s\)\{screen=knownScreen\(/, "setScreen must check the page name");
assert(page.indexOf("state-machines.js") < page.indexOf("backend.js?v="), "The registry loads before the code that uses it");

assert.equal(fs.readFileSync(docsPath, "utf8"), renderDocs(), "docs/state-machines.md is stale: run npm run build:state-docs");
console.log(`State machines: ${all.length} declared, ${moves} backend moves and ${targets.size} page targets checked, docs current`);
