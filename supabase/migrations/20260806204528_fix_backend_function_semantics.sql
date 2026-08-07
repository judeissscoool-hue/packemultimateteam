begin;

-- SQL conditional expressions such as COALESCE, NULLIF, GREATEST and LEAST
-- cannot be schema-qualified. Replace the four affected function bodies.

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_display_name text;
  safe_avatar_url text;
begin
  safe_display_name := pg_catalog.left(
    nullif(
      pg_catalog.btrim(
        coalesce(
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    ),
    40
  );

  safe_avatar_url := nullif(
    pg_catalog.btrim(
      coalesce(
        new.raw_user_meta_data ->> 'avatar_url',
        new.raw_user_meta_data ->> 'picture',
        ''
      )
    ),
    ''
  );

  if safe_avatar_url is not null and (
    pg_catalog.char_length(safe_avatar_url) > 2048
    or safe_avatar_url !~ '^https://'
  ) then
    safe_avatar_url := null;
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, safe_display_name, safe_avatar_url)
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.update_profile(
  p_display_name text,
  p_avatar_url text
)
returns table (
  public_id uuid,
  username text,
  display_name text,
  avatar_url text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  clean_display_name text := nullif(pg_catalog.btrim(p_display_name), '');
  clean_avatar_url text := nullif(pg_catalog.btrim(p_avatar_url), '');
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if clean_display_name is not null
    and pg_catalog.char_length(clean_display_name) > 40 then
    raise exception 'Display name must be 40 characters or fewer' using errcode = '22023';
  end if;

  if clean_avatar_url is not null and (
    pg_catalog.char_length(clean_avatar_url) > 2048
    or clean_avatar_url !~ '^https://'
  ) then
    raise exception 'Avatar URL must be a valid HTTPS URL' using errcode = '22023';
  end if;

  return query
  update public.profiles p
  set display_name = clean_display_name,
      avatar_url = clean_avatar_url
  where p.id = caller_id
  returning p.public_id, p.username, p.display_name, p.avatar_url, p.updated_at;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.sync_cloud_save(
  p_expected_revision bigint,
  p_schema_version integer,
  p_payload jsonb,
  p_client_updated_at timestamptz,
  p_import_id uuid default null
)
returns table (
  outcome text,
  revision bigint,
  schema_version integer,
  payload jsonb,
  client_updated_at timestamptz,
  server_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

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
  if clean_mode not in ('draft', 'pack', 'one_v_one') then
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
      pg_catalog.sum(l.points) as points,
      pg_catalog.sum(l.wins)::bigint as wins,
      pg_catalog.sum(l.losses)::bigint as losses,
      pg_catalog.max(l.team_ovr) as best_team_ovr,
      pg_catalog.max(
        case when l.mode in ('draft', 'pack') then l.wins else 0 end
      )::smallint as best_projected_wins
    from public.leaderboard_entries l
    where l.mode = clean_mode
      and l.created_at >= period_start
    group by l.user_id
  ),
  ranked as (
    select
      pg_catalog.rank() over (
        order by
          case when clean_mode = 'one_v_one' then t.wins else 0 end desc,
          t.points desc,
          t.games asc,
          t.user_id
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

commit;
