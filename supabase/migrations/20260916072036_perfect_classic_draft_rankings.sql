begin;

-- Perfect-only Classic Draft rankings and editable saved lineups.
-- Draft points store 1000 + the uncapped OVR with Chem rating used by the game.
-- Historical perfect scores are replayed and converted below; other history remains stored.
-- No season dates/rewards are activated by this migration.

create or replace function public.create_ranked_run(
  p_mode text,
  p_rules_version text
)
returns table (
  run_id uuid,
  mode text,
  rules_version text,
  draft_seed text,
  run_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  clean_mode text := pg_catalog.btrim(p_mode);
  clean_rules_version text := pg_catalog.btrim(p_rules_version);
  generated_seed text;
  generated_token text;
  new_run public.game_runs%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if clean_mode is distinct from 'draft' then
    raise exception 'Invalid ranked mode' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.rulesets r
    where r.version = clean_rules_version and r.enabled
      and r.version in ('atu-classic-v2', 'atu-classic-v3', 'atu-history-draft-v1')
  ) then
    raise exception 'Rules version is not active' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 8134101)
  );

  -- Normal play must not consume or be blocked by pending duel slots.
  -- Keep four recent attempts; the newly requested run becomes the fifth.
  update public.game_runs as old
  set status = 'cancelled', updated_at = pg_catalog.now()
  where old.id in (
    select r.id from public.game_runs r
    where r.user_id = caller_id and r.mode in ('draft', 'pack')
      and r.status = 'started' and r.expires_at > pg_catalog.now()
    order by r.created_at desc, r.id desc offset 4
  );

  -- Unlimited daily attempts. Pending-run cleanup above is not a daily quota.

  generated_seed := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  generated_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.game_runs (
    user_id, mode, rules_version, draft_seed, nonce_hash
  )
  values (
    caller_id,
    clean_mode,
    clean_rules_version,
    generated_seed,
    pg_catalog.encode(extensions.digest(generated_token, 'sha256'), 'hex')
  )
  returning * into new_run;

  return query
  select new_run.id, new_run.mode, new_run.rules_version, new_run.draft_seed,
    generated_token, new_run.expires_at;
end;
$$;


CREATE OR REPLACE FUNCTION public.finalize_validated_run(p_run_id uuid, p_user_id uuid, p_run_token text, p_roster jsonb, p_transcript jsonb, p_score numeric, p_team_ovr numeric, p_projected_wins smallint, p_result_digest text)
 RETURNS TABLE(outcome text, challenge_status text, winner_profile_id uuid)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  target_run public.game_runs%rowtype;
  target_challenge public.async_challenges%rowtype;
  player_side smallint;
  first_entry public.challenge_entries%rowtype;
  winner_user_id uuid;
  saved_entry public.leaderboard_entries%rowtype;
  saved_actions jsonb;
  incoming_prefix jsonb;
  action_count integer;
begin
  if p_run_token is null
    or pg_catalog.encode(extensions.digest(p_run_token, 'sha256'), 'hex') is null then
    raise exception 'Invalid run token' using errcode = '22023';
  end if;

  if p_roster is null
    or pg_catalog.jsonb_typeof(p_roster) <> 'object'
    or pg_catalog.octet_length(p_roster::text) > 65536 then
    raise exception 'Invalid roster payload' using errcode = '22023';
  end if;

  if p_transcript is null
    or pg_catalog.jsonb_typeof(p_transcript) <> 'array'
    or pg_catalog.octet_length(p_transcript::text) > 262144 then
    raise exception 'Invalid transcript payload' using errcode = '22023';
  end if;

  if p_score is null or p_score not between 0 and 1000000
    or p_team_ovr is null or p_team_ovr not between 0 and 200
    or p_projected_wins is null or p_projected_wins not between 0 and 82
    or p_result_digest is null or p_result_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid validated result' using errcode = '22023';
  end if;

  select r.*
  into target_run
  from public.game_runs r
  where r.id = p_run_id
  for update;

  if found and target_run.mode = 'pack' then
    raise exception 'Pack Mode is not eligible for rankings' using errcode = '22023';
  end if;
  if found and target_run.mode = 'draft'
    and (target_run.rules_version not in ('atu-classic-v2', 'atu-classic-v3', 'atu-history-draft-v1')
      or p_projected_wins <> 82 or p_score not between 1060 and 1120
      or p_score <> pg_catalog.round(p_score, 2)) then
    raise exception 'Only validated 82-0 Classic Drafts qualify' using errcode = '22023';
  end if;

  -- Keep one row per draft. Only append legal lineup swaps after its first save.
  -- The Edge Function replays every action before it calls this service-only RPC.
  if found and target_run.mode = 'draft' and target_run.status = 'completed' then
    if target_run.user_id <> p_user_id
      or target_run.nonce_hash <> pg_catalog.encode(extensions.digest(p_run_token, 'sha256'), 'hex') then
      raise exception 'Invalid run owner or token' using errcode = '22023';
    end if;
    select l.* into saved_entry from public.leaderboard_entries l where l.run_id = p_run_id;
    if not found then raise exception 'Invalid saved draft' using errcode = '22023'; end if;
    if saved_entry.result_digest = p_result_digest and saved_entry.transcript = p_transcript
      and saved_entry.roster = p_roster and saved_entry.points between 1060 and 1120 then
      return query select 'completed'::text, null::text, null::uuid;
      return;
    end if;
    if target_run.expires_at <= pg_catalog.now() then
      raise exception 'Run expired for ranking updates' using errcode = '22023';
    end if;
    action_count := pg_catalog.jsonb_array_length(saved_entry.transcript) - 1;
    saved_actions := saved_entry.transcript - action_count;
    select coalesce(pg_catalog.jsonb_agg(e.value order by e.ordinality), '[]'::jsonb)
      into incoming_prefix from pg_catalog.jsonb_array_elements(p_transcript) with ordinality e
      where e.ordinality <= action_count;
    if pg_catalog.jsonb_array_length(p_transcript) < action_count + 1
      or incoming_prefix <> saved_actions
      or p_transcript->-1->>'type' is distinct from 'arrange'
      or exists (
        select 1 from pg_catalog.jsonb_array_elements(p_transcript) with ordinality e
        where e.ordinality > action_count and e.ordinality < pg_catalog.jsonb_array_length(p_transcript)
          and e.value->>'type' is distinct from 'swap'
      ) then
      raise exception 'Invalid revision: only lineup swaps may follow the saved draft' using errcode = '22023';
    end if;
    if saved_entry.points between 1060 and 1120 and p_score < saved_entry.points then
      raise exception 'Invalid revision: best saved rating cannot decrease' using errcode = '22023';
    end if;
    if saved_entry.points not between 1060 and 1120 or p_score > saved_entry.points then
      update public.leaderboard_entries l set points = p_score, team_ovr = p_team_ovr,
        roster = p_roster, transcript = p_transcript, result_digest = p_result_digest,
        wins = 82, losses = 0
      where l.run_id = p_run_id;
      -- created_at remains the original save time; improvements do not move weeks.
    end if;
    return query select 'completed'::text, null::text, null::uuid;
    return;
  end if;

  -- A lost response can be retried, but only with the same owner, token and result.
  if found and target_run.status = 'completed' and target_run.mode in ('draft','pack')
    and target_run.user_id = p_user_id
    and target_run.nonce_hash = pg_catalog.encode(extensions.digest(p_run_token, 'sha256'), 'hex')
    and exists (select 1 from public.leaderboard_entries l
      where l.run_id = p_run_id and l.result_digest = p_result_digest
        and l.transcript = p_transcript and l.roster = p_roster) then
    return query select 'completed'::text, null::text, null::uuid;
    return;
  end if;

  if not found
    or target_run.user_id <> p_user_id
    or target_run.status <> 'started'
    or target_run.expires_at <= pg_catalog.now()
    or target_run.nonce_hash <>
      pg_catalog.encode(extensions.digest(p_run_token, 'sha256'), 'hex') then
    raise exception 'Run is invalid, expired or already consumed' using errcode = 'P0001';
  end if;

  if target_run.mode <> 'one_v_one' then
    insert into public.leaderboard_entries (
      run_id, user_id, mode, points, wins, losses, team_ovr,
      roster, transcript, result_digest, rules_version
    )
    values (
      target_run.id,
      target_run.user_id,
      target_run.mode,
      p_score,
      p_projected_wins,
      82 - p_projected_wins,
      p_team_ovr,
      p_roster,
      p_transcript,
      p_result_digest,
      target_run.rules_version
    );

    update public.game_runs r
    set status = 'completed', submitted_at = pg_catalog.now()
    where r.id = target_run.id;

    return query select 'completed'::text, null::text, null::uuid;
    return;
  end if;

  select c.*
  into target_challenge
  from public.async_challenges c
  where c.id = target_run.challenge_id
  for update;

  if not found or target_challenge.status in ('completed', 'expired', 'cancelled') then
    raise exception 'Challenge is not active' using errcode = 'P0001';
  end if;

  player_side := case
    when target_challenge.created_by = p_user_id then 1
    when target_challenge.opponent_id = p_user_id then 2
    else null
  end;

  if player_side is null
    or (player_side = 1 and target_challenge.status <> 'creator_drafting')
    or (player_side = 2 and target_challenge.status <> 'accepted') then
    raise exception 'Player cannot submit in the current challenge state' using errcode = 'P0001';
  end if;

  insert into public.challenge_entries (
    challenge_id, run_id, user_id, side, roster, transcript,
    score, team_ovr, projected_wins, result_digest
  )
  values (
    target_challenge.id, target_run.id, p_user_id, player_side,
    p_roster, p_transcript, p_score, p_team_ovr,
    p_projected_wins, p_result_digest
  );

  update public.game_runs r
  set status = 'completed', submitted_at = pg_catalog.now()
  where r.id = target_run.id;

  if player_side = 1 then
    update public.async_challenges c
    set status = 'open'
    where c.id = target_challenge.id;

    return query select 'creator_completed'::text, 'open'::text, null::uuid;
    return;
  end if;

  select e.*
  into first_entry
  from public.challenge_entries e
  where e.challenge_id = target_challenge.id and e.side = 1;

  if not found then
    raise exception 'Creator result is missing' using errcode = 'P0001';
  end if;

  winner_user_id := case
    when first_entry.score > p_score then first_entry.user_id
    when first_entry.score < p_score then p_user_id
    else null
  end;

  update public.async_challenges c
  set status = 'completed',
      winner_id = winner_user_id,
      completed_at = pg_catalog.now()
  where c.id = target_challenge.id;

  insert into public.leaderboard_entries (
    run_id, user_id, mode, points, wins, losses, team_ovr,
    roster, transcript, challenge_id, result_digest, rules_version
  )
  select
    e.run_id,
    e.user_id,
    'one_v_one',
    e.score,
    case
      when winner_user_id is null then 0
      when e.user_id = winner_user_id then 1
      else 0
    end,
    case
      when winner_user_id is null then 0
      when e.user_id = winner_user_id then 0
      else 1
    end,
    e.team_ovr,
    e.roster,
    e.transcript,
    target_challenge.id,
    e.result_digest,
    target_challenge.rules_version
  from public.challenge_entries e
  where e.challenge_id = target_challenge.id;

  return query
  select 'challenge_completed'::text, 'completed'::text, p.public_id
  from (select winner_user_id as id) w
  left join public.profiles p on p.id = w.id;
end;
$function$
;


create or replace function public.get_leaderboard(
  p_mode text,
  p_period text default 'all_time',
  p_limit integer default 50
)
returns table (
  rank bigint,
  profile_id uuid,
  username text,
  avatar_url text,
  games bigint,
  points numeric,
  wins bigint,
  losses bigint,
  best_team_ovr numeric,
  best_projected_wins smallint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  clean_mode text := pg_catalog.btrim(p_mode);
  clean_period text := pg_catalog.btrim(p_period);
  period_start timestamptz;
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
$$;


-- Replacements retain existing privileges; state the intended grants explicitly.
revoke all on function public.finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text) from public, anon, authenticated;
grant execute on function public.finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text) to service_role;
revoke all on function public.create_ranked_run(text,text) from public, anon;
grant execute on function public.create_ranked_run(text,text) to authenticated;
revoke all on function public.get_leaderboard(text,text,integer) from public;
grant execute on function public.get_leaderboard(text,text,integer) to anon, authenticated;

-- Replayed historical perfect drafts; keyed by existing result digest, no user IDs.
update public.leaderboard_entries l set points = verified.points
from (values
('af4603ab2ef6892f559695d5b59a058ee610b06873ba0eeb5fa68f6f38b20b87', 1102.95::numeric),
('f6a4113f17cd8a4d0d8ae45d85a7dc2adc8ebc1acf73f3e046c1a3bd967ae3d5', 1102.67::numeric)
) verified(digest,points)
where l.result_digest = verified.digest and l.mode = 'draft' and l.wins = 82 and l.losses = 0
  and l.points not between 1060 and 1120;
-- Stop rather than silently omit any perfect results added since this export.
do $$ begin
  if exists(select 1 from public.leaderboard_entries where mode='draft' and wins=82 and losses=0 and points not between 1060 and 1120) then
    raise exception 'Refresh the verified perfect-draft backfill before applying this migration';
  end if;
end $$;

commit;
