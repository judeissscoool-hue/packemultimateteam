# Roster and G.M.M release — 13 September 2026

Adds the approved all-time roster changes, positions, eras, playstyles and special chemistry memberships. New runs choose Modern & Nostalgia (default, 1,062 card versions) or True History (1,141). All 925 previous card IDs remain readable; 217 IDs are added. Richard/Rip Hamilton's duplicate ID 173 remains available in saved collections but is excluded from new pulls.

The shared upper projection anchor is 103.6, moving the rounded 82-win boundary to approximately 102.4 effective OVR. The existing requirement that all eight cards be at least 85 remains. Lower curve anchors through effective OVR 100, pack budgets, tier odds, tier limits and chemistry weights are unchanged. Near-miss guidance uses the actual rounded boundary.

## Calibration

The target is the original game's stronger-play baseline: Draft 2.97%, Pack 2.73%. The earlier 1% experiment was rejected and is not deployed.

| Pool | Fresh Draft simulations | Fresh Pack simulations |
| --- | --- | --- |
| Modern & Nostalgia | 1,543 / 50,000 = 3.086% | 1,285 / 50,000 = 2.570% |
| True History | 578 / 20,000 = 2.890% | 541 / 20,000 = 2.705% |

These are close to the agreed targets, not exact matches or measured live-player probabilities. The policy uses revealed cards only and searches every reachable legal final Draft arrangement. Pack evaluation searches eligible 85+ lineups, retaining unsuccessful runs in the denominator. Roster, acquisition and scoring inputs match the calibrated artifacts; all 123,858 completed fresh rosters were rechecked against this release's client/server scoring.

## Rules and existing saves

| Runs | Rules versions | Validator |
| --- | --- | --- |
| Existing | atu-v1, atu-classic-v2, atu-pack-v2 | atu-challenge-v3 |
| New Modern | atu-classic-v3, atu-pack-v3 | atu-gmm-v1 |
| New History | atu-history-draft-v1, atu-history-pack-v1 | atu-gmm-v1 |

The frozen `legacy` engine/data exactly match the previously deployed validator. Old online runs replay with those cards and rules; completed retries retain the old result digest. Existing saved scores and leaderboard entries are not recalculated. The browser uses the corresponding legacy preview for those online runs. Changing the pool selector applies to the next run.

## Release procedure and verification

1. Run `npm run build:engine-data` and `npm test`.
2. Deploy the compatible `validate-run` function, including all `_shared` dependencies, with JWT verification enabled.
3. Execute `supabase/releases/gmm-roster-20260913.sql` to register the four new rulesets. Keep existing rules enabled.
4. Push the matching frontend and generated data together, then verify the Vercel deployment and live controls.

Tests cover stable card IDs, pool membership, aliases, Yao's style veto, iconic draft classes, versioned Draft/Pack replay, old/new 82-0 fixtures, legacy digest stability, authentication, forged submissions, online save retry, UI controls and sandbox isolation. Browser checks cover the selector, newly added cards, Draft interactions and narrow mobile layout.

For rollback, restore the previous frontend commit while leaving the compatible validator and all registered rulesets in place so already-created runs remain finishable. Do not delete the frozen legacy files or modify a published ruleset in place; future roster/scoring releases need a new version and renewed G.M.M checks.
