// Generates docs/state-machines.md from state-machines.js.
// Run: npm run build:state-docs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const docsPath = path.join(root, "docs", "state-machines.md");

export function loadMachines() {
  const window = { console };
  vm.runInNewContext(fs.readFileSync(path.join(root, "state-machines.js"), "utf8"), { window, console });
  return window.ATUStateMachines;
}

export function renderDocs(machines = loadMachines()) {
  const all = machines.describe();
  const lines = [
    "# State machines",
    "",
    "<!-- Generated from state-machines.js by `npm run build:state-docs`. Do not edit by hand. -->",
    "",
    "Every state machine in the game client is declared in `state-machines.js`. This page is generated from it.",
    "",
    "## Working with them",
    "",
    "- **Change a state:** in `backend.js` call `move(machine, holder, field, to)`. Never assign the field directly; `tests/state-machines.test.mjs` fails if you do.",
    "- **Add a state or a move:** declare it in `state-machines.js`, handle it where the page is drawn, then run `npm run build:state-docs`.",
    "- **Undeclared moves never block the player.** The value is still written. The move is logged once and kept in `ATUStateMachines.violations`. The backend tests fail on any such entry.",
    "- **Inspect a running game:** `ATUStateMachines.snapshot()` in the browser console returns the current state of every machine. The current page is also on `#app` as `data-screen`.",
    "- **Stored** machines keep their state in one field. **Derived** machines are read from several fields with the helper named in the table; the code that owns those fields makes the moves.",
    "",
    "| Machine | Kind | Lives in | Field | States |",
    "| --- | --- | --- | --- | --- |",
    ...all.map(m => `| [${m.name}](#${m.name.toLowerCase()}) | ${m.kind} | \`${m.owner}\` | \`${m.field}\` | ${m.states.length} |`),
    ""
  ];
  for (const m of all) {
    const openToAll = m.states.every(s => s.to.includes(machines.ANY));
    lines.push(`## ${m.name}`, "", m.summary, "", `Starts in \`${m.initial}\`.`, "");
    lines.push("| State | Meaning | Can move to |", "| --- | --- | --- |");
    for (const s of m.states) {
      const moves = s.to.includes(machines.ANY) ? "any state" : s.to.length ? s.to.map(t => `\`${t}\``).join(", ") : "nothing (final)";
      lines.push(`| \`${s.id}\` | ${s.label}${s.unreachable ? " (declared and labelled, but no code enters it today)" : ""} | ${moves} |`);
    }
    lines.push("");
    if (!openToAll) {
      lines.push("```mermaid", "stateDiagram-v2", `  [*] --> ${m.initial}`);
      for (const s of m.states) for (const t of s.to) lines.push(`  ${s.id} --> ${t}`);
      lines.push("```", "");
    }
  }
  lines.push(
    "## In-flight latches",
    "",
    "These booleans only stop a second copy of one request from starting. Each is set before the request and cleared when it settles, so they are not modelled as machines.",
    "",
    "| Latch | Lives in | Guards |",
    "| --- | --- | --- |",
    "| `state.busy` | `backend.js` | Account and duel buttons while a request runs |",
    "| `state.refreshingChallenge` | `backend.js` | One duel refresh at a time |",
    "| `state.friends.busy`, `state.friends.loading` | `backend.js` | Friend actions and list refreshes |",
    "| `cloudPush`, `cloudPrepare` | `backend.js` | One cloud save and one cloud check at a time |",
    "| `gameSubmissions[mode]` | `backend.js` | One result submission per mode |",
    "| `startingNormalRun` | `index.html` | One Classic Draft start at a time |",
    ""
  );
  return lines.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(docsPath, renderDocs());
  console.log("Wrote docs/state-machines.md");
}
