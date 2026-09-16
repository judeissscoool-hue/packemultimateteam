-- The inaugural beta includes the preserved, verified perfect Classic Drafts.
-- Return the complete population and caller's standing even outside the top 100.
create or replace function public.get_beta_season_status()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with totals as (
    select l.user_id, pg_catalog.count(*) as games,
      pg_catalog.count(*) * 1000 + pg_catalog.max(l.points - 1000) as points,
      pg_catalog.max(l.points - 1000) as best_team_ovr
    from public.leaderboard_entries l
    where l.mode = 'draft' and l.wins = 82 and l.losses = 0
      and l.points between 1060 and 1120
    group by l.user_id
  ), ranked as (
    select pg_catalog.rank() over (order by t.points desc) as rank, t.* from totals t
  )
  select pg_catalog.jsonb_build_object(
    'season_id', 'beta', 'name', 'Beta season',
    'eligible_players', (select pg_catalog.count(*) from ranked),
    'viewer', (select pg_catalog.jsonb_build_object('rank', r.rank, 'games', r.games,
      'points', r.points, 'best_team_ovr', r.best_team_ovr)
      from ranked r where r.user_id = (select auth.uid()))
  );
$$;
revoke all on function public.get_beta_season_status() from public;
grant execute on function public.get_beta_season_status() to anon, authenticated;
