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

