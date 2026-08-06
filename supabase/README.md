# Supabase backend setup

This project keeps its existing static `index.html` client. Supabase supplies authentication, cloud saves, verified rankings, and asynchronous challenge storage.

## 1. Create and configure the project

1. Create a Supabase project.
2. Apply `supabase/migrations/202608060001_async_backend.sql`.
3. In Authentication > URL Configuration, set the production Site URL to `https://packemultimateteam.com`.
4. Add the local development URL and production URL to the redirect allow list.
5. Keep email confirmation enabled.
6. Configure custom SMTP before production email sign-up. Supabase's trial mailer is not a production sender.

## 2. Google sign-in

1. Create a Web OAuth client in Google Auth Platform.
2. Add `https://packemultimateteam.com` as an authorized JavaScript origin.
3. Copy the Supabase Google callback URL into Google's authorized redirect URIs.
4. Add the Google Client ID and Client Secret in Supabase Authentication > Providers > Google.
5. Request only `openid`, email, and profile scopes.

## 3. Client configuration

Copy `supabase-config.example.js` to `supabase-config.js` and fill in:

- the Supabase project URL
- the publishable/anon key

The publishable key is safe in browser code when Row Level Security is enabled. Never put the service-role key in this repository or in `index.html`.

## 4. Security model

- Players may read and update only their own cloud save.
- Players may read only challenges in which they participate.
- A challenge code exposes limited invitation metadata through an RPC.
- Browsers cannot insert, update, or delete challenge results or leaderboard entries.
- Result submission must go through a server-side Edge Function using the service role after validating the deterministic seed, roster, rules version, and score.
- Public leaderboards are read through `get_leaderboard(mode, period, limit)`.

## 5. Asynchronous 1v1 lifecycle

1. The creator requests a challenge. The database generates a code and deterministic draft seed.
2. The creator completes and submits a roster through the server validation function.
3. The creator shares `?challenge=CODE`.
4. The opponent signs in, accepts the challenge, and drafts from the same seed and rules version.
5. The server validates both rosters, computes the result, closes the challenge, and writes verified ranking entries.

Do not trust client-submitted OVR, points, wins, card ownership, or challenge outcomes.
