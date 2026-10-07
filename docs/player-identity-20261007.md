# Classic Draft player identity correction — October 7

The reported roster contained card 288 (`Robert Williams`, Boston Gold 85, C) and card 1293 (`Robert Williams III`, Boston Gold 85, C/PF). Both are active card IDs for the same person. The earlier selector compared display names literally, so the missing suffix bypassed its board and squad uniqueness checks. This was independent of exact-card repeat protection, which correctly treats different card IDs separately.

The explicit identity map in `player-identity-20261007.js` covers the two confirmed active alias groups:

| Canonical identity | Existing card names and IDs |
| --- | --- |
| Robert Williams III | Robert Williams: 288; Robert Williams III: 742 (Portland), 1293 (Boston) |
| Kenyon Martin Jr. | KJ Martin: 605 (Houston); Kenyon Martin Jr.: 755 (Clippers) |

The NBA identifies the Boston and Portland player as [Robert Williams III](https://www.nba.com/celtics/player/1629057/robert-williams-iii). The [76ers' acquisition profile](https://www.nba.com/sixers/news/kj-martin-bio-stats-facts) identifies KJ Martin as Kenyon Martin Jr.

The identity helper accepts public cards (`name`), compact engine cards (`n`) or a name string. Every other name remains unchanged. In particular, it preserves Kenyon Martin (156) versus his son, Gary Payton versus Gary Payton II, Tim Hardaway versus Tim Hardaway Jr., Glenn Robinson versus Glenn Robinson III, Larry Nance versus Larry Nance Jr., Isiah versus Isaiah Thomas, and Jalen versus Jaylin Williams. Suffix stripping and fuzzy matching would merge genuine separate players and are intentionally excluded. Richard/Rip Hamilton was already handled: ID 147 is active, while duplicate ID 173 remains readable but unavailable for acquisition.

The new selector uses the explicit identity for captain-board uniqueness, ordinary offer-board uniqueness, exclusion of already drafted players, and final pick validation. Trusted Classic transcript validation also requires eight distinct player identities. The UI state marker is `playerIdentityVersion:'atu-player-identity-v1'`; new local drafts carry `identityCardCycleDraft`. Card IDs, ratings, positions, artwork, historical records and cross-draft protection remain unchanged. Passing over one version still protects only that exact offered ID, and an unselected alternate version remains eligible.

Modern `atu-classic-v14` and True History `atu-history-draft-v12` introduce the correction. Earlier selectors and engines stay frozen, including Modern v13 and History v11 transcripts that contain the reported duplicate. The fixed reproduction transcripts are tested against both versions: old replay remains valid, while new rules reject the duplicate before recording history or finalizing results. The same rarity probabilities, roster caps, 85% Bronze/Silver/Gold/Elite release and 60% Icon release continue to apply. Restarting under the corrected version retains the existing account and device cycles.

Regression coverage includes the named aliases in both directions, the Portland card, the distinct-player examples above, forged or stale offer boards, exact-ID history through restarts, and card-ticket probabilities. One thousand complete drafts per roster pool check canonical identity uniqueness on every board and final roster, reach every active card, and compare actual guest starts and JSON-restored actions against trusted server replay. HTTP handler tests execute the real handlers with authentication and database boundaries mocked; SQL permission and migration checks are separate.
