begin;

-- Cover every foreign key identified by the Supabase performance advisor.
create index if not exists async_challenges_rules_version_idx
  on public.async_challenges (rules_version);

create index if not exists async_challenges_winner_idx
  on public.async_challenges (winner_id)
  where winner_id is not null;

create index if not exists game_runs_rules_version_idx
  on public.game_runs (rules_version);

create index if not exists challenge_entries_user_idx
  on public.challenge_entries (user_id);

create index if not exists leaderboard_challenge_idx
  on public.leaderboard_entries (challenge_id)
  where challenge_id is not null;

create index if not exists leaderboard_rules_version_idx
  on public.leaderboard_entries (rules_version);

-- These raw tables deliberately have no browser-readable rows. Explicit restrictive
-- policies document and enforce that contract in addition to revoked table grants.
drop policy if exists "Raw profiles are server only" on public.profiles;
create policy "Raw profiles are server only"
on public.profiles as restrictive for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "Raw cloud saves are server only" on public.cloud_saves;
create policy "Raw cloud saves are server only"
on public.cloud_saves as restrictive for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "Raw rulesets are server only" on public.rulesets;
create policy "Raw rulesets are server only"
on public.rulesets as restrictive for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "Raw challenges are server only" on public.async_challenges;
create policy "Raw challenges are server only"
on public.async_challenges as restrictive for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "Raw game runs are server only" on public.game_runs;
create policy "Raw game runs are server only"
on public.game_runs as restrictive for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "Raw challenge entries are server only" on public.challenge_entries;
create policy "Raw challenge entries are server only"
on public.challenge_entries as restrictive for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "Raw leaderboard entries are server only" on public.leaderboard_entries;
create policy "Raw leaderboard entries are server only"
on public.leaderboard_entries as restrictive for all
to anon, authenticated
using (false)
with check (false);

commit;
