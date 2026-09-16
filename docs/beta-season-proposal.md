# Beta season — approved release

Initial review inspected main at `0dbe5fd913b7580560d260856916c337d2401762` and the live Supabase schema on 2026-09-16. The user subsequently approved publishing this release.

## Proposed experience

- Persistent **BETA SEASON** banner at the top. Season 01 is the beta.
- 82–0 Club opens on season rankings, above all play options.
- Rankings and Rewards tabs. Show perfect-draft count, season score and best OVR including chemistry. Highlight the viewer's row.
- A five-step milestone unlocks ONE featured player-card skin after five separate verified 82–0 drafts during the season. This is independent of rank; claim once at the fifth qualifying finish, not once per five finishes.
- Placement prizes are additional, settled once at season end. Highest qualifying tier only; no accumulation of every lower tier. Preserve the milestone skin regardless of final placement.
- Preview uses synthetic names/results, not real player data. The gold reward sleeve is a placeholder, not new card art. Dates and featured player remain unset.

## Ranking rule

`season_score = perfect_draft_count * 1000 + best_ovr_with_chemistry`

The bonus is the maximum rating from that user's qualifying perfect drafts, added once. Following the lineup-edit review, use the engine's `effectiveRating`, matching the existing court's **OVR with Chem** readout; do not add chemistry again. This corrects the earlier raw-base-plus-chem proposal so the user improves the same metric they see in the game. The rating is at most 120 with current rules, so it cannot overtake another perfect draft. Store its two-decimal value as integer hundredths or NUMERIC to avoid floating-point ranking errors. Example: 12 perfect drafts and 103.42 = 12,103.42 points. 11 perfect drafts and 104.06 = 11,104.06 points, which ranks lower.

Canonical order is `(perfect_draft_count DESC, best_rating_hundredths DESC)`. Use competition rank for exact ties (1, 1, 3); tied players receive the same placement package. Stable row ordering may use a public profile ID but MUST NOT break the shared reward rank.

Classic Draft is now explicitly the only eligible mode. Pack Mode cannot submit ranked results, appear as a ranking filter, or grant 82–0 Club prestige. Pack Mode remains available as unranked play. The existing Modern and History pools share the draft board; Daily, era-locked and sandbox play remain ineligible. Duel rankings remain separate from Classic Draft qualification.

Only 82–0 drafts may be saved to rankings; reaching 82–0 never auto-submits or locks the lineup. A manual save registers the draft. Later legal lineup swaps can improve its saved best OVR without incrementing its perfect-draft count. A worse lineup never replaces the saved best. Attempts have no daily quota; expired runs and bounded replay payloads still retain their existing integrity checks.

Proposed ranking eligibility: at least one verified perfect draft in the beta. Percentiles use all eligible accounts, not just the fetched first 100 rows. Each percentage cutoff includes `ceil(eligible_accounts * percentage)`. Absolute and percentile brackets may overlap, particularly in a small beta; select the highest reward package the player qualifies for. No placement package below top 80%, but the milestone remains independent.

## Proposed placement packages

All amounts are design proposals for All-Time Ultimate, NOT Injustice payout figures. The current Rafters pack price is 400 CR. Final amounts need economy tuning after the season duration is selected.

| Finish | CR | Rafters packs | Profile cosmetic |
|---|---:|---:|---|
| 1st | 20,000 | 10 | Champion badge + shiny gold 1st title |
| 2nd | 15,000 | 8 | Shiny silver 2nd title |
| 3rd | 12,000 | 6 | Shiny bronze 3rd title |
| Top 10 | 8,000 | 5 | Top 10 badge |
| Top 50 | 6,000 | 4 | Top 50 badge |
| Top 100 | 4,000 | 3 | Top 100 badge |
| Top 5% | 3,200 | 2 | — |
| Top 10% | 2,400 | 1 | — |
| Top 20% | 1,600 | 1 | — |
| Top 50% | 800 | 0 | — |
| Top 80% | 400 | 0 | — |

## What the current code and database establish

- `backend.js:rankingsHTML()` puts play options before leaderboard filters/results. It offers Draft, Pack, Duel and all-time/daily/weekly periods.
- Live `get_leaderboard()` sums points from all submitted runs. It does not count perfect drafts for ordering and has no season boundary. Rank ordering includes user ID, preventing true shared ties.
- `leaderboard_entries` has unique-run identity, mode, wins, losses, points, roster, rules version and timestamps. The current public schema has no season definition, payout ledger or skin entitlement tables.
- The server engine returns `teamOvr`, `chemistry` and `effectiveRating`. Displayed `teamOvr` already includes chemistry but is rounded and capped at 99. Adding chemistry to that again would double-count it and would not restore the raw tiebreaker.
- `effectiveRating` uses chemistry multiplied by 2.10 for win projection. It is now used directly for the tiebreaker to match the existing court readout.
- Credits currently live in the client save payload. Competitive rewards must use authoritative entitlements and idempotent redemption; simply adding client credits is insufficient.

## Implementation requirements after design approval

1. Define immutable beta season ID, start/end UTC, eligible modes/pools and rules versions. Count only runs started and finalized inside the season; no old-run backfill unless explicitly chosen.
2. Persist the server-recomputed OVR with Chem metric with each validated run. The browser cannot supply trusted wins, count or rating.
3. Aggregate unique validated `run_id`s with `wins=82 AND losses=0`; preserve retry idempotency. Reordering the same roster cannot award another perfect draft.
4. Return season standings, total eligible population, the viewer's rank outside the top 100, progress and reward tier through a scoped API. Keep old 1v1 ranking semantics separate.
5. Create private season/entitlement/payout storage with RLS, explicit grants and no client write path. Settle final standings consistently; use a unique `(season_id, user_id, reward_kind)` key and atomic credit/item grant so retries cannot double-award. Define season-close policy for pending validations.
6. Integrate player-skin ownership/equip behavior and Rafters pack vouchers. Freeze approved reward definitions before the season opens.

## Injustice: Gods Among Us Mobile research

Borrow the combination of a featured seasonal item and a rank-based bundle of currency/items. The milestone skin is this game's requested addition, independent of the competitive prize ladder.

- [Community event history](https://www.reddit.com/r/InjusticeMobile/comments/aa1sm2/injustice_mobile_2018_event_history/) records weekly featured character/gear seasons and top-5% special rewards.
- [Player progression account](https://www.reddit.com/user/mtgy425/comments/iu5zm8/250_days_of_playing_injustice/) describes earning characters, gear, credits and Nth Metal through multiplayer progression and percentile finishes.
- [Top-3% character reward discussion](https://www.reddit.com/r/InjusticeMobile/comments/wcgkva/how_much_br_would_you_need_for_top_3_two_copies/) discusses two character copies for that tier.
- [Season reward report](https://www.reddit.com/r/InjusticeMobile/comments/befhyd/i_didnt_get_my_season_rewards/) describes a top-5% bundle of metal, credits and Aquaman, along with a delivery failure. This reinforces the need for reliable one-time settlement.

The wiki reward table was blocked by robots.txt. Exact historical per-tier credit amounts were not verified; do not present the proposed CR ladder above as copied from Injustice. Injustice 2 season passes are a different system and were not used for this proposal.

## Preview

`previews/beta-season.fragment.html` is a self-contained interaction mockup. It is not wired to production, performs no requests or writes, and is not loaded by the game. Rankings/Rewards tabs and the reward shortcut work; game launch buttons are deliberately inactive.

## Validation performed

Checked fragment size/markup, unique IDs, all interaction selectors, JavaScript syntax, tab/shortcut/keyboard behavior and count-first score ordering. Browser screenshot inspection was unavailable: Chromium is not installed and its download timed out. The subsequent local implementation passed the full application test suite and the database regression checks described below.


## Gameplay implementation

Release contents:
- Client: Pack never starts or submits a ranked run; non-perfect drafts have no ranking-save control; no automatic submission on reaching 82; lineup swaps remain available during retries and after saving. Responses preserve moves made while a save was in flight.
- Edge validator: independently rejects Pack, non-Classic rules and draft results below 82 wins. Derives ranking OVR from the pinned server engine, never browser inputs.
- Database migration: removes the 50-attempt daily quota; enforces perfect-only submission; allows authenticated, replay-validated, append-only lineup revisions on one unique run entry; preserves the highest rating and original timestamp. Draft rank = count × 1000 + best OVR with Chem. Identical draft scores share rank.
- Local Pack perfect prestige and Pack share-image Club certification removed. Existing historical data is retained.
- Replayed the two existing verified perfect drafts using their original rulesets and prepared digest-keyed score conversions so they stay ranked. No live changes were made. If new historical perfect records arrive before deployment, the migration deliberately stops until its backfill is refreshed with `scripts/prepare-perfect-ranking-backfill.mjs`.

The migration, Edge validator and client ship together. The beta board uses the existing verified perfect drafts plus new perfect drafts. The live Club now includes Rankings/Rewards tabs, current standing badges beside handles, all approved reward tiers, and server-derived five-draft progress. Badges describe current standings and do not yet constitute permanent season awards. Beta end date and featured skin remain unset. Automatic settlement, credit/pack delivery and permanent cosmetic ownership are not implemented in this release; the UI explicitly states rewards have not been issued.

Validation: full existing npm suite passes. A disposable PGlite PostgreSQL instance applied every migration and tested more than 50 attempts, Pack rejection, rejection below 82 wins, retry idempotency, improved-score updates without duplicate rows, immutable draft picks, wrong-token rejection, count-first ordering and preservation/conversion of existing perfect results. No production database writes, commits, pushes or deployment.

### Badge revision

Placement titles use shiny gold “1st”, silver “2nd” and bronze “3rd” text with no surrounding frame. First place also keeps the Champion badge. Top 10, Top 50 and Top 100 keep their profile badges. Percentile tiers keep their credits and packs but no longer grant profile badges. The focused preview is `previews/season-badges.fragment.html`.

## Release validation

The complete npm suite and disposable PostgreSQL regression checks passed after wiring the production Club UI. Added checks cover escaped handles, the retained badges, no draft badges on Duel standings, full-population percentile rewards, viewer rank outside the top 100, and the independent five-draft progress. The season summary exposes only population size and the authenticated caller's standing. Its anonymous execute grant is intentional for public season population; all result finalization remains service-role only. No new table grants or RLS exemptions.
