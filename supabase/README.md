# Supabase backend setup

This project keeps its existing static `index.html` client. Supabase supplies authentication, cloud saves, verified rankings, and asynchronous challenge storage.

## 1. Create and configure the project

1. Create a Supabase project.
2. Apply every file in `supabase/migrations/` in filename order. The first migration
   creates the schema; the later migrations preserve the exact fixes applied while
   validating the live project.
3. In Authentication > URL Configuration, set the Site URL to
   `https://packemultimateteam.com`.
4. Add these production redirects to the allow list:
   - `https://packemultimateteam.com/?auth=account`
   - `https://packemultimateteam.com/?challenge=*`
   The second pattern preserves the opaque 16-character challenge code through sign-in;
   it does not expose the seed. Add localhost callbacks only while actively developing.
5. Keep email confirmation enabled.
6. Configure custom SMTP before production email sign-up. Supabase's trial mailer is not a production sender.

## 2. Google sign-in

1. Create a Web OAuth client in Google Auth Platform.
2. Add `https://packemultimateteam.com` as an authorized JavaScript origin.
3. Copy the Supabase Google callback URL into Google's authorized redirect URIs.
4. Add the Google Client ID and Client Secret in Supabase Authentication > Providers > Google.
5. Request only `openid`, email, and profile scopes.

## 3. Client configuration

`supabase-config.js` contains this project's public browser values. For another project,
copy `supabase-config.example.js` to `supabase-config.js` and fill in:

- the Supabase project URL
- the publishable/anon key

The publishable key is safe in browser code when Row Level Security is enabled. Never put the service-role key in this repository or in `index.html`.

The browser client is pinned to an exact `supabase-js` version and protected with a
SHA-384 integrity hash in `index.html`. If the dependency cannot load, the game remains
available with device-only saves and does not attempt backend calls.

## 4. Account and cloud-save client

- Email/password signup requires email verification.
- Sign-in, password recovery, password update, Google OAuth, sign-out and session
  restoration are implemented in `backend.js`.
- Profile reads and writes use the restricted profile RPCs; login emails and auth UUIDs
  are never returned by the public profile API.
- All existing `atu-*` progress keys are wrapped in a versioned, size-checked save.
- A first login uploads local progress only when the cloud is empty.
- If meaningful local progress and an existing cloud save are both present without a
  shared revision, the app stops and asks the player which copy to use. It creates a
  local backup before applying either choice.
- Subsequent writes are debounced and use the server's compare-and-swap revision. A
  stale device receives a conflict instead of overwriting the newer cloud revision.

## 5. Security model
- Raw tables have explicit deny-all RLS policies and no browser grants.
- Players read and update only their own cloud save through revision-checked RPCs.
- Players read their own challenge state through ownership-checked RPCs.
- A challenge code exposes limited invitation metadata through an RPC.
- Browsers cannot insert, update, or delete challenge results or leaderboard entries.
- Result submission must go through a server-side Edge Function using a server-only
  secret key after replaying the deterministic draft and independently validating the
  seed, run token, transcript, roster, rules version, OVR, score, and projected record.
- Public leaderboards are read through `get_leaderboard(mode, period, limit)`.
- Ranked Draft, Ranked Pack and asynchronous 1v1 each begin with a one-time
  server-issued run. The shared deterministic engine uses mode-specific offer boards,
  and the trusted validator replays the transcript before publishing any score.

## 6. Asynchronous 1v1 lifecycle

1. The creator requests a challenge. The database generates a code and deterministic draft seed.
2. The creator completes and submits a roster through the server validation function.
3. The creator shares `?challenge=CODE`.
4. The opponent signs in, accepts the challenge, and drafts from the same seed and rules version.
5. The server validates both rosters, computes the result, closes the challenge, and writes verified ranking entries.

Do not trust client-submitted OVR, points, wins, card ownership, or challenge outcomes.

## 7. Tests

`supabase/tests/backend_security_regression.sql` runs entirely inside a transaction
that ends with `ROLLBACK`. It verifies profile sanitization, conflict-safe cloud saves,
hidden pre-acceptance seeds, delayed seed release, challenge completion, winner
calculation, verified leaderboard writes and run-token replay rejection.

`node tests/backend-client.test.cjs` checks browser-client fallback behavior, signed-out
auth rendering, public challenge invitations without seeds, initial cloud import,
revision metadata, legacy save conflict blocking, backup creation and cloud-download
resolution without requiring a real test account. `node tests/atu-engine-v1.test.mjs`
checks deterministic Draft and Pack manifests, tier limits, position rules, transcript
tampering and parity with the canonical scoring logic in `index.html`.

The Supabase security advisor reports the deliberately exposed RPC functions because
they use `SECURITY DEFINER`; this is expected. Each function has an empty search path,
an explicit role grant, input limits, and authentication/ownership checks. Raw table
access remains denied. “Unused index” notices are expected before production traffic.
