# Fresh 82–0 season — October 10, 2026

The account-wide reset starts a new server-owned Beta season (`beta-20261010`). Its start timestamp is recorded when the database migration runs. Every account begins with zero seasonal perfect drafts and zero progress toward the five-draft season milestone.

Both the 82–0 standings and the viewer's milestone progress use the same private season setting. Draft daily and weekly rankings also exclude the previous season. Duel rankings retain their existing date and ranking rules.

A qualifying Classic Draft must have both its original server run and its saved leaderboard entry created at or after the new season start. This applies to both Modern and History pools. Saving an unfinished old draft after the reset, retrying a previous save, or improving an old saved lineup cannot carry its result into the new season. New drafts keep the existing count-once, perfect-only, rating, and shared-rank rules.

Historical runs and ranking entries remain saved. Credits, trophies and their one-time payout flags, packs, skins, collections, personal records and cloud-save payloads are not reset. No automatic season payout is introduced by this change.

The current season is stored in `app_private.classic_draft_seasons`, a single server-owned row with RLS enabled and no client read or write grants. The existing read-only ranking RPCs expose standings and the authenticated caller's progress. No client season-setting API is added.

Already open ranking screens cache their results. Refresh the site and start a new draft after the reset. The server supplies the new season immediately; no frontend or Edge Function deployment is required.

Validation covers old history, pending old submissions, new Modern and History runs, season and daily/weekly boundaries, same-run improvements, competition ties, caller isolation, anonymous population access, private-setting permissions, unchanged Duel standings, and unchanged reward/save data. Production verification checks both ranking RPCs and preservation fingerprints.

The focused regression is `node tests/beta-season-reset.test.mjs`. It uses disposable PostgreSQL through pinned `@electric-sql/pglite@0.5.8` in the task's isolated output runtime, with no production connection. On another machine, set `PGLITE_MODULE_PATH` to that package's `dist/index.js`; no game dependency changes are required.
