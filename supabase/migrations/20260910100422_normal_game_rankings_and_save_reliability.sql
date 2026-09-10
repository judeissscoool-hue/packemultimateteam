-- Register replay rules for ordinary Pack Mode.
insert into public.rulesets(version, validator_version, enabled) values ('atu-pack-v2','atu-challenge-v3',true) on conflict(version) do update set enabled=true;

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

CREATE OR REPLACE FUNCTION public.sync_cloud_save(p_expected_revision bigint, p_schema_version integer, p_payload jsonb, p_client_updated_at timestamp with time zone, p_import_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(outcome text, revision bigint, schema_version integer, payload jsonb, client_updated_at timestamp with time zone, server_updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller_id uuid := auth.uid();
  current_save public.cloud_saves%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Expected revision must be zero or greater' using errcode = '22023';
  end if;

  if p_schema_version is null or p_schema_version not between 1 and 1000 then
    raise exception 'Unsupported save schema version' using errcode = '22023';
  end if;

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Save payload must be a JSON object' using errcode = '22023';
  end if;

  if pg_catalog.octet_length(p_payload::text) > 1048576 then
    raise exception 'Save payload exceeds the 1 MiB limit' using errcode = '22001';
  end if;

  -- Serialize creation as well as updates; a missing row cannot be row-locked.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text, 8134104));

  select s.*
  into current_save
  from public.cloud_saves s
  where s.user_id = caller_id
  for update;

  if not found then
    if p_expected_revision <> 0 then
      return query
      select 'missing'::text, 0::bigint, p_schema_version, null::jsonb,
        null::timestamptz, null::timestamptz;
      return;
    end if;

    insert into public.cloud_saves (
      user_id, revision, schema_version, payload, client_updated_at, last_import_id
    )
    values (
      caller_id, 1, p_schema_version, p_payload, p_client_updated_at, p_import_id
    )
    returning * into current_save;

    return query
    select 'created'::text, current_save.revision, current_save.schema_version,
      current_save.payload, current_save.client_updated_at, current_save.updated_at;
    return;
  end if;

  if p_import_id is not null and current_save.last_import_id = p_import_id then
    return query
    select 'unchanged'::text, current_save.revision, current_save.schema_version,
      current_save.payload, current_save.client_updated_at, current_save.updated_at;
    return;
  end if;

  if current_save.revision <> p_expected_revision then
    return query
    select 'conflict'::text, current_save.revision, current_save.schema_version,
      current_save.payload, current_save.client_updated_at, current_save.updated_at;
    return;
  end if;

  update public.cloud_saves s
  set revision = s.revision + 1,
      schema_version = p_schema_version,
      payload = p_payload,
      client_updated_at = p_client_updated_at,
      last_import_id = coalesce(p_import_id, s.last_import_id)
  where s.user_id = caller_id
  returning * into current_save;

  return query
  select 'updated'::text, current_save.revision, current_save.schema_version,
    current_save.payload, current_save.client_updated_at, current_save.updated_at;
end;
$function$
;
