# Exact-card repeat protection

New Classic Drafts roll the same rarity odds, then uniformly draw an eligible **card ID** that is not currently protected. There is no equal-player stage and no per-restart shuffled player list. Multiple card versions are separate tickets; offering one version does not protect another. Existing same-board and selected-squad player uniqueness remain.

Every offered card enters protection, including cards the user passes over. Each rarity has its own cycle. Once `ceil(poolSize * releaseFraction)` distinct IDs have been offered, the next offer from that rarity clears its protection and starts a new cycle. The current release fraction is **0.75**, as requested. The pool is the complete available card pool for that rarity, not the discovered collection. Changing the fraction does not change rarity probabilities.

A position can run out of unseen eligible cards before the whole rarity reaches its threshold. In that case, only the oldest currently eligible protected card is released. The already rolled rarity is retained. Empty rarity/position pools and selected Icon/Elite caps retain their earlier fallback rules.

Signed-in history persists across restarts, refreshes and devices, with separate Modern and True History pools. `draft_fairness` contains an immutable snapshot `{kind:'card-cycle-v1',releaseFraction:0.75,shown:[...]}`. The selector emits ordered offer/reset/release events; the trusted handler replays the transcript before recording them. Idempotent cumulative checkpoints and a per-pool active-run cursor prevent duplicate recording and late older resets from clearing newer protection. Starting a replacement run flushes the previous transcript before taking its snapshot.

An older run remains independently replayable. Concurrent runs do not reserve unrevealed future cards against one another; once a newer run becomes active, older new checkpoints do not mutate the current cycle. This matches the ordinary one-active-draft flow without applying stale reset events.

Guest and era drafts persist device history separately by roster pool and era. Their secure random seed and word offset remain in draft state, so recreated local action factories continue the same sequence. Randomness uses the validated deterministic cryptographic generator with unbiased integer selection; no shuffled player orders are created.

Modern uses `atu-classic-v12`; True History uses `atu-history-draft-v10`. Prior engines remain frozen for existing drafts, and Pack Mode and Daily Challenge keep their rules. New starts use exact-card cycles. The release fraction is a parameter in the immutable run snapshot; the trusted start handler and local default currently supply 0.75, allowing later tuning without changing the selection algorithm.

Tests cover exact-card rather than player frequencies, independent card versions, per-rarity 75% boundaries, position scarcity, ordered history, restarts, cached boards, seven-pick restoration, account checkpoint retries, authentication, forged transcripts, all card versions, and frozen previous-rule replay.
