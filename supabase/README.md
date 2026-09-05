# Supabase backend setup

This project keeps its existing static `index.html` client. Supabase supplies authentication, cloud saves, verified rankings, asynchronous challenge storage, and friends-only online status.

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
   - `https://*-judeissscoool-5284s-projects.vercel.app/**` while testing Vercel previews
   The second pattern preserves the opaque 16-character challenge code through sign-in;
   it does not expose the seed. Remove the Vercel wildcard after preview testing if it is
   no longer needed. Add localhost callbacks only while actively developing.
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

- Raw tables have deny-all RLS and no browser grants. The private social tables use
  PostgreSQL's default-deny behavior when no policies exist.
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

## 7. Friends and online status

- `20260905084946_friends_online.sql` adds the `social_private` schema and four
  authenticated RPCs: `request_friend`, `change_friendship`, `get_friends`, and
  `touch_presence`. Keep `social_private` out of the API's exposed schemas.
- Public wrappers are `SECURITY INVOKER`. Privileged bodies stay in the private
  schema, use an empty search path, and require an existing signed-in profile with
  a username. Browser roles cannot read or write the tables directly.
- Requests require an exact, case-insensitive username. Only the recipient can
  accept or decline; the sender can cancel. Either accepted friend can remove the
  relationship. Actions use stable public profile IDs, not mutable usernames.
- A pending request never reveals online status. Accepted friends receive only a
  public profile ID, username, relationship, and online boolean. No last-seen
  timestamp, email, internal account ID, or draft data is returned.
- Presence heartbeats run every 30 seconds while signed in and the game is
  visible. Only the server supplies the identity and timestamp. Status expires
  after 90 seconds without a heartbeat; with list polling, the indicator may take
  up to two minutes to show offline. No browsing history is stored.
- Requests and online status refresh every 15 seconds on any visible game page.
  Incoming requests appear in a floating Accept/Decline popup and the top navigation
  shows a pending-request count. Later dismisses a popup for this tab without declining;
  the request remains on Friends. Popups queue one at a time and do not steal focus.
  Refreshes replace just the Friends panels and changed notifications,
  preserving draft pickers, open navigation, and form input. Hidden/offline tabs stop polling;
  signing out clears the in-memory list. Friends data is not in local cloud saves.
- Limits are 100 relationships per player (pending plus accepted) and 20 new
  requests per hour. Cancelling/declining does not reset the hourly counter.
- Removing a friend revokes future status reads. Account deletion cascades through
  friendships, presence, and rate counters. Duels still use the existing invite link
  after the creator locks in their draft; this feature does not send direct invites.

## 8. Tests

`supabase/tests/backend_security_regression.sql` runs entirely inside a transaction
that ends with `ROLLBACK`. It verifies profile sanitization, conflict-safe cloud saves,
hidden pre-acceptance seeds, delayed seed release, challenge completion, winner
calculation, verified leaderboard writes and run-token replay rejection.

`supabase/tests/friends_security_regression.sql` creates temporary players and rolls
everything back. It tests requests, acceptance consent, pending/stranger privacy,
anonymous denial, raw-table denial, rate limiting and recovery, presence expiry,
removal, and deletion cleanup. Run it against a migrated database through an
authorized SQL connection; it does not send emails or alter existing players.

`node tests/backend-client.test.cjs` checks browser-client fallback behavior, signed-out
auth rendering, public challenge invitations without seeds, initial cloud import,
revision metadata, legacy save conflict blocking, backup creation and cloud-download
resolution without requiring a real test account. `node tests/atu-engine-v1.test.mjs`
checks deterministic Draft and Pack manifests, tier limits, position rules, transcript
tampering and parity with the canonical scoring logic in `index.html`.
The client suite also exercises friend-request actions, safe error text, status
polling with a fake clock, offline/hidden-tab behavior, no draft rerenders, form
preservation, and late responses after sign-out. `npm test` runs all five suites.

The Supabase security advisor reports the deliberately exposed RPC functions because
they use `SECURITY DEFINER`; this is expected. Each function has an empty search path,
an explicit role grant, input limits, and authentication/ownership checks. Raw table
access remains denied. “Unused index” notices are expected before production traffic.
The three private social tables produce informational
[RLS Enabled No Policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy):
their default-deny behavior is intentional and covered by the role-based regression
test. Do not add browser table grants or permissive policies to silence these notices.
