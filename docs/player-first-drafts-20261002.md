# Player-first Classic Drafts

New Classic Drafts roll rarity as before, choose uniformly among eligible player names in that rarity and position, then choose uniformly among that player's eligible card versions. Multiple franchise versions no longer give a player extra tickets. A player with one eligible version and a player with three eligible versions have equal chances in that particular draw; the latter's chance is divided across their three versions.

Base board odds remain Bronze 14%, Silver 40%, Gold 40%, Elite 4%, Icon 2%. Captains retain the existing equal Icon/Elite tier roll and era fallback. Position eligibility, unavailable-tier retries and roster limits are unchanged. The actual mix of offers still depends on these existing constraints and player selections.

The selector uses no draft history, prior-offer exclusion, recency, exposure weights or shuffle bag. Unpicked players may recur on later boards and in later drafts. Existing unique-name constraints on a board and in the selected squad remain.

The browser and server share `player-first-draft.js`. Modern & Nostalgia uses `atu-classic-v10`; True History uses `atu-history-draft-v8`. New local and era drafts opt in with `playerFirstDraft`. Account drafts request the matching new rules. Earlier selectors and engine versions stay frozen, and earlier website tabs can still start and validate their existing rules. Pack Mode and Daily Challenge rules are unchanged.

The migration registers the new versions and extends only the inspected Classic Draft allowlists in `create_ranked_run` and `finalize_validated_run`. It retains existing grants, authentication, function security modes and ranking requirements. New account drafts continue returning `draft_fairness: null` without reading or writing exposure history.

Validation: the full repository suite passed. The new test checks 80,000 controlled first offers for equal player and eligible-version chances; 4,000 completed real-pool drafts reach all 1,126 Modern and 1,301 History versions. It checks unchanged rarity boundaries and caps, immediate reoffers of unpicked players, frozen v9/v7 fingerprints, browser/server parity, seven-pick replay and restart isolation. Actual account-start and validation handlers are exercised with mocked authentication/database boundaries, including old clients and forged picks.

Production backend: migration `20261002073806_player_first_card_drafts`, draft-history version 7 and validate-run version 16, both retaining JWT verification. Live queries confirmed both new rules enabled alongside the old rules and the existing function grants and security modes preserved. Security advisor findings matched the pre-release baseline; no auth or permissions changes were introduced.
