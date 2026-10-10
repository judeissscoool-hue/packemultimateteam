begin;

-- A new server-owned season boundary. Historical drafts and every account's
-- cloud save, credits, trophies, packs and cosmetic ownership remain untouched.
create table app_private.classic_draft_seasons (
  singleton boolean primary key default true check (singleton),
  season_id text not null unique,
  name text not null,
  starts_at timestamptz not null
);
alter table app_private.classic_draft_seasons enable row level security;
revoke all on table app_private.classic_draft_seasons from public, anon, authenticated;

insert into app_private.classic_draft_seasons (singleton, season_id, name, starts_at)
values (true, 'beta-20261010', 'Beta season', pg_catalog.statement_timestamp());

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_mode text, p_period text DEFAULT 'all_time'::text, p_limit integer DEFAULT 50)
 RETURNS TABLE(rank bigint, profile_id uuid, username text, avatar_url text, games bigint, points numeric, wins bigint, losses bigint, best_team_ovr numeric, best_projected_wins smallint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  clean_mode text := pg_catalog.btrim(p_mode);
  clean_period text := pg_catalog.btrim(p_period);
  period_start timestamptz;
  season_start timestamptz;
begin
  if clean_mode not in ('draft', 'one_v_one') then
    raise exception 'Invalid leaderboard mode' using errcode = '22023';
  end if;

  if clean_period not in ('all_time', 'daily', 'weekly') then
    raise exception 'Invalid leaderboard period' using errcode = '22023';
  end if;

  period_start := case clean_period
    when 'daily' then pg_catalog.date_trunc('day', pg_catalog.now(), 'UTC')
    when 'weekly' then pg_catalog.date_trunc('week', pg_catalog.now(), 'UTC')
    else '-infinity'::timestamptz
  end;

  -- Draft dates apply to both the saved entry and the original run.
  -- A pre-reset draft submitted/retried later cannot enter the new season.
  if clean_mode = 'draft' then
    select s.starts_at into season_start
    from app_private.classic_draft_seasons s where s.singleton;
    if not found then
      raise exception 'Season configuration unavailable';
    end if;
    period_start := greatest(period_start, season_start);
  end if;

  return query
  with totals as (
    select
      l.user_id,
      pg_catalog.count(*) as games,
      case when clean_mode = 'draft' then pg_catalog.count(*) * 1000 + pg_catalog.max(l.points - 1000) else pg_catalog.sum(l.points) end as points,
      pg_catalog.sum(l.wins)::bigint as wins,
      pg_catalog.sum(l.losses)::bigint as losses,
      case when clean_mode = 'draft' then pg_catalog.max(l.points - 1000) else pg_catalog.max(l.team_ovr) end as best_team_ovr,
      pg_catalog.max(
        case when l.mode in ('draft', 'pack') then l.wins else 0 end
      )::smallint as best_projected_wins
    from public.leaderboard_entries l
    where l.mode = clean_mode
      and l.created_at >= period_start
      and (clean_mode = 'one_v_one' or exists (
        select 1 from public.game_runs r
        where r.id = l.run_id and r.user_id = l.user_id and r.mode = 'draft'
          and r.created_at >= season_start
      ))
      and (clean_mode = 'one_v_one' or (l.wins = 82 and l.losses = 0 and l.points between 1060 and 1120))
    group by l.user_id
  ),
  ranked as (
    select
      pg_catalog.rank() over (
        order by
          case when clean_mode = 'one_v_one' then t.wins else 0 end desc,
          t.points desc,
          case when clean_mode = 'one_v_one' then t.games else 0 end asc,
          case when clean_mode = 'one_v_one' then t.user_id else null end
      ) as rank,
      t.*
    from totals t
  )
  select
    r.rank,
    p.public_id,
    coalesce(p.username, p.display_name, 'Player'),
    p.avatar_url,
    r.games,
    r.points,
    r.wins,
    r.losses,
    r.best_team_ovr,
    r.best_projected_wins
  from ranked r
  join public.profiles p on p.id = r.user_id
  order by r.rank, p.public_id
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$function$;

create or replace function public.get_beta_season_status()
returns jsonb
language sql stable security definer set search_path = ''
as $function$
  with season as (
    select s.season_id, s.name, s.starts_at
    from app_private.classic_draft_seasons s where s.singleton
  ), totals as (
    select l.user_id, pg_catalog.count(*) as games,
      pg_catalog.count(*) * 1000 + pg_catalog.max(l.points - 1000) as points,
      pg_catalog.max(l.points - 1000) as best_team_ovr
    from public.leaderboard_entries l
    join public.game_runs r on r.id = l.run_id and r.user_id = l.user_id and r.mode = 'draft'
    cross join season s
    where l.mode = 'draft' and l.wins = 82 and l.losses = 0
      and l.points between 1060 and 1120
      and l.created_at >= s.starts_at and r.created_at >= s.starts_at
    group by l.user_id
  ), ranked as (
    select pg_catalog.rank() over (order by t.points desc) as rank, t.* from totals t
  )
  select pg_catalog.jsonb_build_object(
    'season_id', s.season_id, 'name', s.name, 'starts_at', s.starts_at,
    'eligible_players', (select pg_catalog.count(*) from ranked),
    'viewer', (select pg_catalog.jsonb_build_object('rank', r.rank, 'games', r.games,
      'points', r.points, 'best_team_ovr', r.best_team_ovr)
      from ranked r where r.user_id = (select auth.uid()))
  ) from season s;
$function$;

-- These existing read-only RPCs intentionally expose public standings and only
-- the authenticated caller's season progress. No season-setting write API.
revoke all on function public.get_leaderboard(text,text,integer) from public;
grant execute on function public.get_leaderboard(text,text,integer) to anon, authenticated;
revoke all on function public.get_beta_season_status() from public;
grant execute on function public.get_beta_season_status() to anon, authenticated;

commit;
