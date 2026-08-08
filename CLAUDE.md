# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

**All-Time Ultimate — NBA Pack Opener** is a single-page browser game. Players open
packs (or run a draft) to collect all-time-great NBA cards, arrange a starting five plus
bench, and chase the highest team OVR / projected win total. Chemistry between players
(same team, same era, same playstyle, shared "storylines" like the '92 Dream Team) boosts
the team rating.

It is a **fan-made sandbox** — not affiliated with or endorsed by the NBA. Keep that
framing in any user-facing copy.

## Repository layout

The entire application is **one file**: `index.html` (~1850 lines). There is no build
system, package manager, framework, bundler, test suite, or CI. It is plain HTML + CSS +
vanilla JavaScript, self-contained with zero external dependencies or network calls.

```
index.html   ← everything: markup, <style>, and three <script> blocks
CLAUDE.md    ← this file
```

That's it. Do not add a framework, npm, or a build step unless explicitly asked — the
"deploy" model is simply serving this static file (it's edited directly, often through the
GitHub web editor — note the "Update index.html" commit history).

## How to run / test

There is no test harness. To verify a change:

1. Open `index.html` in any browser (double-click, or `python3 -m http.server` then visit
   `localhost:8000`), **or** publish it as an Artifact to preview.
2. Exercise the affected flow by hand (open packs, build a roster, run a draft, reload to
   confirm persistence).

State persists in `localStorage`. To reset during testing, clear site data or run
`localStorage.clear()` in the console. The keys are `atu-save-v4` and `atu-hs-v4`.

## File anatomy (`index.html`)

| Region | Lines (approx) | Contents |
|---|---|---|
| `<head><style>` | 7–355 | All CSS. Design tokens in `:root`, then component sections marked with `/* ===== NAME ===== */` banners (APP FRAME, SCOREBOARD, CARDS, REVEAL OVERLAY, DRAFT, etc.). |
| `<body>` markup | 357–396 | Static shells only: `#app`, `#overlay`, `#sheet`, `#draftoverlay`, `#policyoverlay`, `nav#tabs`, plus decorative `#neonart` / `#arena`. Screens are injected via JS. |
| Script 1 — **LOGIC** | 397–939 | Pure game logic and data. Wrapped in `//<LOGIC> … //</LOGIC>`. **No DOM access here.** |
| Script 2 — **STATE / UI core** | 940–1234 | Persistence, global state, helpers, nav, the shared hub screen, roster actions. |
| Script 3 — **SCREENS / RENDER** | 1235–1852 | Packs screen, reveal overlay, draft mode, root `render()`, the SVG "squad web", and app init. |

The `//<LOGIC>` … `//</LOGIC>` markers matter: everything inside is data-model and rules
with no side effects on the page, which makes it the safe place to reason about game math.

## Core data model

- **`P`** (line ~402): the raw roster as `[name, position, OVR, team, era]` tuples,
  grouped by rating band in comments (ICON 96–99, ELITE 92–95, GOLD 85–91, …).
- **`POS_EXTRA`** (~line 566): secondary position eligibility per player name.
- **`DB`** (~line 609): `P` mapped into card objects:
  `{ id, name, pos, ovr, team, era, positions[], tier, tags[] }`. `id` is the array index
  and is the stable identifier used everywhere (collections, rosters, share URLs).
- **Tiers** — `tierOf(ovr)`: `Icon ≥96`, `Elite ≥92`, `Gold ≥85`, `Silver ≥75`, else
  `Bronze`. Ordered low→high in `TIER_ORDER`. `POOLS[tier]` groups `DB` by tier.

### Chemistry tags (three families)

Every card gets exactly **one era tag + 1–2 style tags + any story tags**, stamped by the
`DB.forEach(...)` loop at ~line 713:

- **Era** — `ERA_TAG`, derived from the card's decade (`Era_Classic` … `Era_Future`).
- **Style** — `STYLE_TAGS` (explicit per player) with `DEFAULT_STYLE` fallback by position,
  plus an "AUDIT OVERRIDES" `Object.assign` block that corrects/adds archetypes
  (`Style_Slasher`, `Style_AnkleBreaker`, etc.).
- **Story** — `STORY_TAGS` maps a storyline (e.g. `Story_DreamTeam`, `Story_Draft_2003`,
  `Story_Rival_BadBoys`) to a strict member list. `STORIES_BY_NAME` inverts it.

`TAG_LABEL` holds the human-readable display name for every tag. When you add a player or
tag, update the relevant map **and** `TAG_LABEL` so it renders.

## Game systems

- **Packs** (`PACKS`, ~line 723): each pack defines `odds` per tier and an optional
  guaranteed floor tier. `rollTier()` samples a tier from odds; `weightedPick()` +
  `fisherYates()` choose a card while de-prioritizing recently seen ones. The `rare` pack
  draws only from `POOL_90` (OVR ≥ 90).
- **Roster** (~line 785): 5 starter slots `PG/SG/SF/PF/C` + 3 bench `B1/B2/B3`
  (`STARTER_SLOTS`, `BENCH_SLOTS`, `ALL_SLOTS`). `eligible(player, slot)` gates placement.
- **Chemistry** (`chemistry(roster)`, ~line 793): scores **starters only** — team cores
  (2+ starters sharing a franchise) plus tag synergies (unique player *names* per tag).
  Story links pay more than era/style. Returns `{ bonus, links[] }`, bonus capped.
- **Team OVR** (`teamOVR`, ~line 822): `70% starters + 30% bench`, plus chemistry bonus.
  Also returns `eff` (chemistry weighted ~2.2×) which feeds the win curve.
- **Projection** (`projection(eff)`, ~line 837): a cosine-eased curve over `PROJ` anchor
  points → `{ wins, losses, label }` ("Contender", "Historic Juggernaut", …).
- **Draft / Classic modes**: `DRAFT_ODDS` + `draftOptionsFor()` (slot-eligible picks with
  per-run Icon/Elite caps via `draftDowngrade`), and `CLASSIC_ODDS` +
  `classicRollPack()` (budgeted packs, guaranteed role player, tier caps). Captain packs:
  `classicCaptainOptions()`.

## State & rendering

- **Globals** (Script 2): `S` = save (`main` / `rare` / `classic` sides, each with a
  collection map and a roster), `HS` = high scores per mode, `screen` = current view, `D` =
  live draft state, `SHARED` = a roster loaded from a share link. These are plain mutable
  module-level variables — there is no store/reducer.
- **Persistence**: `sGet/sSet/sDel` wrap `localStorage` with an in-memory `MEM` fallback so
  the game still works when storage is blocked. Call `save()` / `saveHS()` after mutating
  `S` / `HS`.
- **Rendering**: `render()` (~line 1770) is the root. It sets `#app.innerHTML` from a
  string template chosen by `screen` (`landing`, `team`, `packs`, `rare`, `draft`,
  `classic`, `share`). There is **no virtual DOM** — screens re-render by rebuilding HTML
  strings. `setScreen(s)` switches views. Event handlers are wired inline via `onclick="…"`
  attributes referencing global functions.
- **Cards**: `cardHTML(p)` builds a 3D flip card (clean front / chemistry "dossier" back);
  `flip3d()` toggles it. `#neonart`, `#arena`, and the `.squadweb` SVG (`drawSquadWeb`) are
  purely decorative.
- **Share links**: `buildShareURL()` / `parseShare()` encode a roster as
  `?share=<mode>:<comma-separated ids>` (legacy `#s=` links still parsed).

## Conventions & style

- **Terse, densely packed code.** Single-letter/short identifiers (`p`, `r`, `t`, `S`,
  `HS`, `DB`), multiple statements per line, minimal whitespace. Match the surrounding
  density — don't reformat existing code into a "cleaner" multi-line style.
- **Comments carry intent.** The tuning rationale lives in inline comments (win-curve
  shape, chemistry multipliers, cap logic). Preserve and update them when you change the
  math.
- Keep pure rules inside `//<LOGIC> … //</LOGIC>`; keep DOM work in Scripts 2–3.
- Escape user-derived/text into HTML via `esc()` when building card/roster markup.
- Honor `prefers-reduced-motion` (already handled in CSS) — don't add motion that ignores it.
- `id` (the `DB` index) is the canonical player reference; adding/removing/reordering
  entries in `P` shifts every id, which invalidates existing saved games and share links.
  Prefer **appending** new players at the end of their tier band, and be aware that
  reordering breaks persistence.
- Canonical aliases exist for readability: `calculateTeamOVR = teamOVR`,
  `updateProjectedRecord = projection`.

## Making common changes

- **Add a player**: append `[name, pos, ovr, team, era]` to `P` (end of the matching tier
  band). Add `POS_EXTRA`, `STYLE_TAGS`, and any `STORY_TAGS` membership as needed. Tier and
  era tags are derived automatically.
- **Add a chemistry tag/story**: extend the relevant map (`STYLE_TAGS` / `STORY_TAGS`) and
  add its `TAG_LABEL`. For the squad-web color, check `WEB_COLORS`.
- **Tune drop rates**: edit the `odds` in `PACKS`, or `DRAFT_ODDS` / `CLASSIC_ODDS` and
  their `*_LIMITS` caps.
- **Tune difficulty/scoring**: adjust `PROJ` (win curve), the `70/30` split and `eff`
  multiplier in `teamOVR`, or the chemistry weights/caps in `chemistry`.

After a change, open the file in a browser and play through the affected mode; watch the
console for errors since there are no automated tests.

## Git workflow

- Active development branch: **`claude/claude-md-docs-7f5mmv`**. Develop, commit, and push
  there; create it from the latest `main` if needed. Do not push to other branches without
  permission.
- `git push -u origin <branch>`; retry transient network failures with backoff.
- Do **not** open a pull request unless explicitly asked.
