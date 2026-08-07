begin;

-- All Time Ultimate backend foundation.
-- This migration intentionally exposes browser access through narrowly scoped RPCs.
-- Raw profiles, saves, seeds, transcripts, run nonces and leaderboard rows remain private.

create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated;

create extension if not exists pgcrypto with schema extensions;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function app_private.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  public_id uuid not null default extensions.gen_random_uuid() unique,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint profiles_username_format check (
    username is null or username ~ '^[A-Za-z0-9_]{3,20}$'
  ),
  constraint profiles_display_name_length check (
    display_name is null or pg_catalog.char_length(display_name) between 1 and 40
  ),
  constraint profiles_avatar_url_safe check (
    avatar_url is null
    or (
      pg_catalog.char_length(avatar_url) <= 2048
      and avatar_url ~ '^https://'
    )
  )
);

create unique index profiles_username_lower_unique
  on public.profiles (pg_catalog.lower(username))
  where username is not null;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function app_private.set_updated_at();

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

revoke all on function app_private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

create table public.cloud_saves (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  schema_version integer not null check (schema_version between 1 and 1000),
  payload jsonb not null,
  client_updated_at timestamptz,
  last_import_id uuid,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint cloud_saves_payload_object check (
    pg_catalog.jsonb_typeof(payload) = 'object'
  ),
  constraint cloud_saves_payload_size check (
    pg_catalog.octet_length(payload::text) <= 1048576
  )
);

create trigger cloud_saves_set_updated_at
before update on public.cloud_saves
for each row execute function app_private.set_updated_at();

create table public.rulesets (
  version text primary key,
  validator_version text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  constraint rulesets_version_format check (
    version ~ '^[A-Za-z0-9._-]{1,64}$'
  ),
  constraint rulesets_validator_version_format check (
    validator_version ~ '^[A-Za-z0-9._-]{1,64}$'
  )
);

insert into public.rulesets (version, validator_version, enabled)
values ('atu-v1', 'atu-v1', true);

create table public.async_challenges (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid references public.profiles(id) on delete set null,
  winner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'creator_drafting'
    check (status in (
      'creator_drafting', 'open', 'accepted', 'completed', 'expired', 'cancelled'
    )),
  rules_version text not null references public.rulesets(version),
  draft_seed text not null,
  expires_at timestamptz not null default (pg_catalog.now() + interval '7 days'),
  completed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint async_challenges_code_format check (
    code ~ '^[A-F0-9]{16}$'
  ),
  constraint async_challenges_seed_format check (
    draft_seed ~ '^[a-f0-9]{64}$'
  ),
  constraint async_challenges_distinct_players check (
    opponent_id is null or opponent_id <> created_by
  ),
  constraint async_challenges_winner_is_player check (
    winner_id is null or winner_id = created_by or winner_id = opponent_id
  ),
  constraint async_challenges_completion_state check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create index async_challenges_created_by_idx
  on public.async_challenges (created_by, created_at desc);

create index async_challenges_opponent_idx
  on public.async_challenges (opponent_id, created_at desc)
  where opponent_id is not null;

create index async_challenges_status_expiry_idx
  on public.async_challenges (status, expires_at);

create index async_challenges_rules_version_idx
  on public.async_challenges (rules_version);

create index async_challenges_winner_idx
  on public.async_challenges (winner_id)
  where winner_id is not null;

create trigger async_challenges_set_updated_at
before update on public.async_challenges
for each row execute function app_private.set_updated_at();

create table public.game_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('draft', 'pack', 'one_v_one')),
  rules_version text not null references public.rulesets(version),
  draft_seed text not null,
  nonce_hash text not null,
  status text not null default 'started'
    check (status in ('started', 'completed', 'rejected', 'expired', 'cancelled')),
  challenge_id uuid references public.async_challenges(id) on delete cascade,
  expires_at timestamptz not null default (pg_catalog.now() + interval '2 hours'),
  submitted_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint game_runs_seed_format check (
    draft_seed ~ '^[a-f0-9]{64}$'
  ),
  constraint game_runs_nonce_hash_format check (
    nonce_hash ~ '^[a-f0-9]{64}$'
  ),
  constraint game_runs_challenge_mode check (
    (mode = 'one_v_one' and challenge_id is not null)
    or (mode <> 'one_v_one' and challenge_id is null)
  ),
  unique (challenge_id, user_id)
);

create index game_runs_user_created_idx
  on public.game_runs (user_id, created_at desc);

create index game_runs_active_idx
  on public.game_runs (user_id, status, expires_at)
  where status = 'started';

create index game_runs_rules_version_idx
  on public.game_runs (rules_version);

create trigger game_runs_set_updated_at
before update on public.game_runs
for each row execute function app_private.set_updated_at();

create table public.challenge_entries (
  challenge_id uuid not null references public.async_challenges(id) on delete cascade,
  run_id uuid not null unique references public.game_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  side smallint not null check (side in (1, 2)),
  roster jsonb not null,
  transcript jsonb not null,
  score numeric(12,2) not null check (score between 0 and 1000000),
  team_ovr numeric(6,2) not null check (team_ovr between 0 and 200),
  projected_wins smallint not null check (projected_wins between 0 and 82),
  result_digest text not null,
  submitted_at timestamptz not null default pg_catalog.now(),
  primary key (challenge_id, user_id),
  unique (challenge_id, side),
  constraint challenge_entries_roster_object check (
    pg_catalog.jsonb_typeof(roster) = 'object'
  ),
  constraint challenge_entries_roster_size check (
    pg_catalog.octet_length(roster::text) <= 65536
  ),
  constraint challenge_entries_transcript_array check (
    pg_catalog.jsonb_typeof(transcript) = 'array'
  ),
  constraint challenge_entries_transcript_size check (
    pg_catalog.octet_length(transcript::text) <= 262144
  ),
  constraint challenge_entries_digest_format check (
    result_digest ~ '^[a-f0-9]{64}$'
  )
);

create table public.leaderboard_entries (
  id bigint generated by default as identity primary key,
  run_id uuid not null unique references public.game_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('draft', 'pack', 'one_v_one')),
  points numeric(12,2) not null check (points between 0 and 1000000),
  wins smallint not null default 0 check (wins between 0 and 82),
  losses smallint not null default 0 check (losses between 0 and 82),
  team_ovr numeric(6,2) not null check (team_ovr between 0 and 200),
  roster jsonb not null,
  transcript jsonb not null,
  challenge_id uuid references public.async_challenges(id) on delete set null,
  result_digest text not null unique,
  rules_version text not null references public.rulesets(version),
  created_at timestamptz not null default pg_catalog.now(),
  constraint leaderboard_roster_object check (
    pg_catalog.jsonb_typeof(roster) = 'object'
  ),
  constraint leaderboard_roster_size check (
    pg_catalog.octet_length(roster::text) <= 65536
  ),
  constraint leaderboard_transcript_array check (
    pg_catalog.jsonb_typeof(transcript) = 'array'
  ),
  constraint leaderboard_transcript_size check (
    pg_catalog.octet_length(transcript::text) <= 262144
  ),
  constraint leaderboard_digest_format check (
    result_digest ~ '^[a-f0-9]{64}$'
  )
);

create index challenge_entries_user_idx
  on public.challenge_entries (user_id);

create index leaderboard_mode_created_points_idx
  on public.leaderboard_entries (mode, created_at desc, points desc);

create index leaderboard_user_mode_idx
  on public.leaderboard_entries (user_id, mode, created_at desc);

create index leaderboard_challenge_idx
  on public.leaderboard_entries (challenge_id)
  where challenge_id is not null;

create index leaderboard_rules_version_idx
  on public.leaderboard_entries (rules_version);

alter table public.profiles enable row level security;
alter table public.cloud_saves enable row level security;
alter table public.rulesets enable row level security;
alter table public.async_challenges enable row level security;
alter table public.game_runs enable row level security;
alter table public.challenge_entries enable row level security;
alter table public.leaderboard_entries enable row level security;

create policy "Raw profiles are server only"
on public.profiles as restrictive for all
to anon, authenticated
using (false)
with check (false);

create policy "Raw cloud saves are server only"
on public.cloud_saves as restrictive for all
to anon, authenticated
using (false)
with check (false);

create policy "Raw rulesets are server only"
on public.rulesets as restrictive for all
to anon, authenticated
using (false)
with check (false);

create policy "Raw challenges are server only"
on public.async_challenges as restrictive for all
to anon, authenticated
using (false)
with check (false);

create policy "Raw game runs are server only"
on public.game_runs as restrictive for all
to anon, authenticated
using (false)
with check (false);

create policy "Raw challenge entries are server only"
on public.challenge_entries as restrictive for all
to anon, authenticated
using (false)
with check (false);

create policy "Raw leaderboard entries are server only"
on public.leaderboard_entries as restrictive for all
to anon, authenticated
using (false)
with check (false);

-- No browser role receives raw-table access. RLS is defense in depth; the browser API
-- consists only of the explicitly granted functions below.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.cloud_saves from anon, authenticated;
revoke all on table public.rulesets from anon, authenticated;
revoke all on table public.async_challenges from anon, authenticated;
revoke all on table public.game_runs from anon, authenticated;
revoke all on table public.challenge_entries from anon, authenticated;
revoke all on table public.leaderboard_entries from anon, authenticated;
revoke all on sequence public.leaderboard_entries_id_seq from anon, authenticated;

grant all on table public.profiles to service_role;
grant all on table public.cloud_saves to service_role;
grant all on table public.rulesets to service_role;
grant all on table public.async_challenges to service_role;
grant all on table public.game_runs to service_role;
grant all on table public.challenge_entries to service_role;
grant all on table public.leaderboard_entries to service_role;
grant all on sequence public.leaderboard_entries_id_seq to service_role;

create or replace function public.get_my_profile()
returns table (
  public_id uuid,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
  select p.public_id, p.username, p.display_name, p.avatar_url, p.created_at, p.updated_at
  from public.profiles p
  where p.id = caller_id;
end;
$$;

create or replace function public.get_public_profile(p_username text)
returns table (
  public_id uuid,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.public_id, p.username, p.display_name, p.avatar_url, p.created_at
  from public.profiles p
  where p.username is not null
    and pg_catalog.lower(p.username) = pg_catalog.lower(pg_catalog.btrim(p_username))
    and pg_catalog.char_length(pg_catalog.btrim(p_username)) between 3 and 20
  limit 1;
$$;

create or replace function public.set_username(p_username text)
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
  clean_username text := pg_catalog.btrim(p_username);
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if clean_username is null or clean_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Username must be 3-20 characters using letters, numbers or underscores'
      using errcode = '22023';
  end if;

  return query
  update public.profiles p
  set username = clean_username
  where p.id = caller_id
  returning p.public_id, p.username, p.display_name, p.avatar_url, p.updated_at;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
exception
  when unique_violation then
    raise exception 'Username is already taken' using errcode = '23505';
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

create or replace function public.get_cloud_save()
returns table (
  revision bigint,
  schema_version integer,
  payload jsonb,
  client_updated_at timestamptz,
  server_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
  select s.revision, s.schema_version, s.payload, s.client_updated_at, s.updated_at
  from public.cloud_saves s
  where s.user_id = caller_id;
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

  if clean_mode not in ('draft', 'pack') then
    raise exception 'Invalid ranked mode' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.rulesets r
    where r.version = clean_rules_version and r.enabled
  ) then
    raise exception 'Rules version is not active' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 8134101)
  );

  if (
    select pg_catalog.count(*)
    from public.game_runs r
    where r.user_id = caller_id
      and r.status = 'started'
      and r.expires_at > pg_catalog.now()
  ) >= 5 then
    raise exception 'Too many active ranked runs' using errcode = 'P0001';
  end if;

  if (
    select pg_catalog.count(*)
    from public.game_runs r
    where r.user_id = caller_id
      and r.created_at >= pg_catalog.now() - interval '24 hours'
  ) >= 50 then
    raise exception 'Daily ranked-run quota reached' using errcode = 'P0001';
  end if;

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

create or replace function public.create_async_challenge(p_rules_version text)
returns table (
  challenge_id uuid,
  challenge_code text,
  rules_version text,
  draft_seed text,
  run_id uuid,
  run_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  clean_rules_version text := pg_catalog.btrim(p_rules_version);
  generated_code text;
  generated_seed text;
  generated_token text;
  new_challenge public.async_challenges%rowtype;
  new_run public.game_runs%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.rulesets r
    where r.version = clean_rules_version and r.enabled
  ) then
    raise exception 'Rules version is not active' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = caller_id and p.username is not null
  ) then
    raise exception 'Choose a username before creating a challenge' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 8134102)
  );

  if (
    select pg_catalog.count(*)
    from public.async_challenges c
    where c.created_by = caller_id
      and c.status in ('creator_drafting', 'open', 'accepted')
      and c.expires_at > pg_catalog.now()
  ) >= 5 then
    raise exception 'Too many active challenges' using errcode = 'P0001';
  end if;

  if (
    select pg_catalog.count(*)
    from public.async_challenges c
    where c.created_by = caller_id
      and c.created_at >= pg_catalog.now() - interval '24 hours'
  ) >= 20 then
    raise exception 'Daily challenge quota reached' using errcode = 'P0001';
  end if;

  generated_code := pg_catalog.upper(
    pg_catalog.encode(extensions.gen_random_bytes(8), 'hex')
  );
  generated_seed := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  generated_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.async_challenges (
    code, created_by, rules_version, draft_seed
  )
  values (
    generated_code, caller_id, clean_rules_version, generated_seed
  )
  returning * into new_challenge;

  insert into public.game_runs (
    user_id, mode, rules_version, draft_seed, nonce_hash,
    challenge_id, expires_at
  )
  values (
    caller_id,
    'one_v_one',
    clean_rules_version,
    generated_seed,
    pg_catalog.encode(extensions.digest(generated_token, 'sha256'), 'hex'),
    new_challenge.id,
    new_challenge.expires_at
  )
  returning * into new_run;

  return query
  select new_challenge.id, new_challenge.code, new_challenge.rules_version,
    new_challenge.draft_seed, new_run.id, generated_token, new_challenge.expires_at;
end;
$$;

create or replace function public.get_async_challenge_invitation(p_code text)
returns table (
  challenge_code text,
  status text,
  creator_public_id uuid,
  creator_username text,
  creator_display_name text,
  creator_avatar_url text,
  rules_version text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.code,
    case
      when c.expires_at <= pg_catalog.now() then 'expired'
      else c.status
    end,
    p.public_id,
    p.username,
    p.display_name,
    p.avatar_url,
    c.rules_version,
    c.expires_at
  from public.async_challenges c
  join public.profiles p on p.id = c.created_by
  where pg_catalog.char_length(pg_catalog.btrim(p_code)) = 16
    and c.code = pg_catalog.upper(pg_catalog.btrim(p_code))
    and c.status in ('open', 'accepted', 'completed')
  limit 1;
$$;

create or replace function public.accept_async_challenge(p_code text)
returns table (
  accepted boolean,
  message text,
  challenge_id uuid,
  rules_version text,
  draft_seed text,
  run_id uuid,
  run_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target public.async_challenges%rowtype;
  generated_token text;
  new_run public.game_runs%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if pg_catalog.char_length(pg_catalog.btrim(p_code)) <> 16 then
    return query select false, 'Challenge not found'::text, null::uuid, null::text,
      null::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  select c.*
  into target
  from public.async_challenges c
  where c.code = pg_catalog.upper(pg_catalog.btrim(p_code))
  for update;

  if not found then
    return query select false, 'Challenge not found'::text, null::uuid, null::text,
      null::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  if target.expires_at <= pg_catalog.now() then
    update public.async_challenges c
    set status = 'expired'
    where c.id = target.id and c.status <> 'completed';

    update public.game_runs r
    set status = 'expired'
    where r.challenge_id = target.id and r.status = 'started';

    return query select false, 'Challenge has expired'::text, target.id,
      target.rules_version, null::text, null::uuid, null::text, target.expires_at;
    return;
  end if;

  if target.created_by = caller_id then
    return query select false, 'You cannot accept your own challenge'::text,
      target.id, target.rules_version, null::text, null::uuid, null::text,
      target.expires_at;
    return;
  end if;

  if target.status <> 'open' or target.opponent_id is not null then
    return query select false, 'Challenge is no longer available'::text,
      target.id, target.rules_version, null::text, null::uuid, null::text,
      target.expires_at;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 8134103)
  );

  if (
    select pg_catalog.count(*)
    from public.game_runs r
    where r.user_id = caller_id
      and r.created_at >= pg_catalog.now() - interval '24 hours'
  ) >= 50 then
    return query select false, 'Daily ranked-run quota reached'::text,
      target.id, target.rules_version, null::text, null::uuid, null::text,
      target.expires_at;
    return;
  end if;

  generated_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  update public.async_challenges c
  set opponent_id = caller_id,
      status = 'accepted'
  where c.id = target.id;

  insert into public.game_runs (
    user_id, mode, rules_version, draft_seed, nonce_hash,
    challenge_id, expires_at
  )
  values (
    caller_id,
    'one_v_one',
    target.rules_version,
    target.draft_seed,
    pg_catalog.encode(extensions.digest(generated_token, 'sha256'), 'hex'),
    target.id,
    target.expires_at
  )
  returning * into new_run;

  return query
  select true, 'accepted'::text, target.id, target.rules_version,
    target.draft_seed, new_run.id, generated_token, target.expires_at;
end;
$$;

create or replace function public.get_my_async_challenge(p_challenge_id uuid)
returns table (
  challenge_id uuid,
  challenge_code text,
  status text,
  player_role text,
  creator_username text,
  opponent_username text,
  rules_version text,
  draft_seed text,
  expires_at timestamptz,
  completed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
  select
    c.id,
    c.code,
    case when c.expires_at <= pg_catalog.now() and c.status <> 'completed'
      then 'expired' else c.status end,
    case when c.created_by = caller_id then 'creator' else 'opponent' end,
    creator.username,
    opponent.username,
    c.rules_version,
    c.draft_seed,
    c.expires_at,
    c.completed_at
  from public.async_challenges c
  join public.profiles creator on creator.id = c.created_by
  left join public.profiles opponent on opponent.id = c.opponent_id
  where c.id = p_challenge_id
    and (c.created_by = caller_id or c.opponent_id = caller_id)
  limit 1;
end;
$$;

create or replace function public.cancel_async_challenge(p_challenge_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  changed_count integer;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  update public.async_challenges c
  set status = 'cancelled'
  where c.id = p_challenge_id
    and c.created_by = caller_id
    and c.status in ('creator_drafting', 'open');

  get diagnostics changed_count = row_count;

  if changed_count = 1 then
    update public.game_runs r
    set status = 'cancelled'
    where r.challenge_id = p_challenge_id and r.status = 'started';
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.rotate_run_token(p_run_id uuid)
returns table (
  run_id uuid,
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
  generated_token text;
  target public.game_runs%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select r.*
  into target
  from public.game_runs r
  where r.id = p_run_id and r.user_id = caller_id
  for update;

  if not found or target.status <> 'started' or target.expires_at <= pg_catalog.now() then
    raise exception 'Active run not found' using errcode = 'P0002';
  end if;

  generated_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  update public.game_runs r
  set nonce_hash = pg_catalog.encode(extensions.digest(generated_token, 'sha256'), 'hex')
  where r.id = target.id;

  return query
  select target.id, target.draft_seed, generated_token, target.expires_at;
end;
$$;

create or replace function public.get_async_challenge_result(p_code text)
returns table (
  challenge_code text,
  winner_public_id uuid,
  player_public_id uuid,
  username text,
  avatar_url text,
  side smallint,
  score numeric,
  team_ovr numeric,
  projected_wins smallint,
  roster jsonb,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.code,
    winner.public_id,
    player.public_id,
    player.username,
    player.avatar_url,
    e.side,
    e.score,
    e.team_ovr,
    e.projected_wins,
    e.roster,
    c.completed_at
  from public.async_challenges c
  join public.challenge_entries e on e.challenge_id = c.id
  join public.profiles player on player.id = e.user_id
  left join public.profiles winner on winner.id = c.winner_id
  where pg_catalog.char_length(pg_catalog.btrim(p_code)) = 16
    and c.code = pg_catalog.upper(pg_catalog.btrim(p_code))
    and c.status = 'completed'
  order by e.side;
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

-- Trusted Edge Functions call this RPC only after replaying the run transcript with
-- the pinned ruleset and independently computing every score. Browser roles cannot
-- execute it. The transaction consumes the one-time run token and prevents replay.
create or replace function public.finalize_validated_run(
  p_run_id uuid,
  p_user_id uuid,
  p_run_token text,
  p_roster jsonb,
  p_transcript jsonb,
  p_score numeric,
  p_team_ovr numeric,
  p_projected_wins smallint,
  p_result_digest text
)
returns table (
  outcome text,
  challenge_status text,
  winner_profile_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
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
$$;

revoke all on function public.get_my_profile() from public, anon, authenticated;
revoke all on function public.get_public_profile(text) from public, anon, authenticated;
revoke all on function public.set_username(text) from public, anon, authenticated;
revoke all on function public.update_profile(text, text) from public, anon, authenticated;
revoke all on function public.get_cloud_save() from public, anon, authenticated;
revoke all on function public.sync_cloud_save(bigint, integer, jsonb, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.create_ranked_run(text, text) from public, anon, authenticated;
revoke all on function public.create_async_challenge(text) from public, anon, authenticated;
revoke all on function public.get_async_challenge_invitation(text) from public, anon, authenticated;
revoke all on function public.accept_async_challenge(text) from public, anon, authenticated;
revoke all on function public.get_my_async_challenge(uuid) from public, anon, authenticated;
revoke all on function public.cancel_async_challenge(uuid) from public, anon, authenticated;
revoke all on function public.rotate_run_token(uuid) from public, anon, authenticated;
revoke all on function public.get_async_challenge_result(text) from public, anon, authenticated;
revoke all on function public.get_leaderboard(text, text, integer) from public, anon, authenticated;
revoke all on function public.finalize_validated_run(uuid, uuid, text, jsonb, jsonb, numeric, numeric, smallint, text) from public, anon, authenticated;

grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.set_username(text) to authenticated;
grant execute on function public.update_profile(text, text) to authenticated;
grant execute on function public.get_cloud_save() to authenticated;
grant execute on function public.sync_cloud_save(bigint, integer, jsonb, timestamptz, uuid) to authenticated;
grant execute on function public.create_ranked_run(text, text) to authenticated;
grant execute on function public.create_async_challenge(text) to authenticated;
grant execute on function public.get_async_challenge_invitation(text) to anon, authenticated;
grant execute on function public.accept_async_challenge(text) to authenticated;
grant execute on function public.get_my_async_challenge(uuid) to authenticated;
grant execute on function public.cancel_async_challenge(uuid) to authenticated;
grant execute on function public.rotate_run_token(uuid) to authenticated;
grant execute on function public.get_async_challenge_result(text) to anon, authenticated;
grant execute on function public.get_leaderboard(text, text, integer) to anon, authenticated;
grant execute on function public.finalize_validated_run(uuid, uuid, text, jsonb, jsonb, numeric, numeric, smallint, text) to service_role;

comment on function public.finalize_validated_run(uuid, uuid, text, jsonb, jsonb, numeric, numeric, smallint, text)
is 'Trusted validator only. Never grant this function to anon or authenticated.';

commit;
