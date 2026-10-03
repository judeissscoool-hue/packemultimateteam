begin;

insert into public.rulesets(version,validator_version,enabled) values
('atu-classic-v13','atu-card-cycle-rarity-v1',true),
('atu-history-draft-v11','atu-card-cycle-rarity-v1',true)
on conflict(version) do nothing;

-- Preserve existing ranking bodies, auth checks, ownership, security mode and
-- grants. Extend only the inspected Classic version lists.
do $migration$
declare
  signature text;
  definition text;
  old_list text := '(''atu-classic-v2'', ''atu-classic-v3'', ''atu-history-draft-v1'', ''atu-classic-v4'', ''atu-history-draft-v2'', ''atu-classic-v5'', ''atu-history-draft-v3'',''atu-classic-v6'',''atu-history-draft-v4'',''atu-classic-v7'',''atu-history-draft-v5'',''atu-classic-v8'',''atu-history-draft-v6'',''atu-classic-v9'',''atu-history-draft-v7'',''atu-classic-v10'',''atu-history-draft-v8'',''atu-classic-v11'',''atu-history-draft-v9'',''atu-classic-v12'',''atu-history-draft-v10'')';
  new_list text;
begin
  new_list := pg_catalog.left(old_list,-1) || ',''atu-classic-v13'',''atu-history-draft-v11'')';
  foreach signature in array array[
    'public.create_ranked_run(text,text)',
    'public.finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text)'
  ] loop
    definition := pg_catalog.pg_get_functiondef(signature::regprocedure);
    if pg_catalog.strpos(definition,new_list)>0 then continue; end if;
    if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,old_list,'')))<>pg_catalog.length(old_list) then
      raise exception 'Expected exactly one inspected version allowlist in %',signature;
    end if;
    execute pg_catalog.replace(definition,old_list,new_list);
  end loop;
  if (select count(*) from public.rulesets where version in ('atu-classic-v13','atu-history-draft-v11') and validator_version='atu-card-cycle-rarity-v1' and enabled)<>2 then
    raise exception 'Rarity cycle rules registration mismatch';
  end if;
end;
$migration$;

-- Existing scalar initializer stays frozen for 75%/90% saved drafts and old tabs.
create function public.initialize_card_cycle_rarity(
  p_run_id uuid,
  p_user_id uuid,
  p_pool text,
  p_release_fractions jsonb
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  r public.game_runs%rowtype;
  h jsonb;
  cycle_pool jsonb;
  tier_cards jsonb;
  tier_name text;
  card_entry jsonb;
  card_text text;
  all_shown jsonb := '[]'::jsonb;
  shown jsonb;
  snapshot jsonb;
  active jsonb;
  expected_pool text;
  release_value jsonb;
begin
  if p_pool is null or p_pool not in ('modern','history') then
    raise exception 'Invalid card-cycle pool';
  end if;
  if pg_catalog.jsonb_typeof(p_release_fractions) is distinct from 'object' then
    raise exception 'Invalid rarity release fractions';
  end if;
  if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_release_fractions)) <> 5 then
    raise exception 'Invalid rarity release fractions';
  end if;
  foreach tier_name in array array['Bronze','Silver','Gold','Elite','Icon'] loop
    release_value := p_release_fractions->tier_name;
    if pg_catalog.jsonb_typeof(release_value) is distinct from 'number' then
      raise exception 'Invalid rarity release fraction';
    end if;
    if (release_value #>> '{}')::numeric <= 0 or (release_value #>> '{}')::numeric > 1 then
      raise exception 'Invalid rarity release fraction';
    end if;
  end loop;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,8134101));
  select * into r from public.game_runs where id=p_run_id and user_id=p_user_id for update;
  if not found or r.mode <> 'draft' or r.status <> 'started' or r.expires_at <= pg_catalog.now()
    or r.rules_version not in ('atu-classic-v13','atu-history-draft-v11') then
    raise exception 'Active card-cycle draft not found';
  end if;
  expected_pool := case when r.rules_version='atu-classic-v13' then 'modern' else 'history' end;
  if p_pool <> expected_pool then raise exception 'Card-cycle pool does not match rules'; end if;

  -- Retrying initialization returns the original replay snapshot and must never
  -- reactivate an older run after a newer run has become active.
  if r.draft_fairness is not null then
    if r.draft_fairness->>'kind' is distinct from 'card-cycle-rarity-v1' then
      raise exception 'Invalid card-cycle snapshot';
    end if;
    return r.draft_fairness;
  end if;

  insert into public.draft_offer_history(user_id) values(p_user_id) on conflict do nothing;
  select state into h from public.draft_offer_history where user_id=p_user_id for update;
  if pg_catalog.jsonb_typeof(coalesce(h->'card_cycles','{}'::jsonb)) is distinct from 'object'
    or pg_catalog.jsonb_typeof(coalesce(h->'card_cycle_active','{}'::jsonb)) is distinct from 'object' then
    raise exception 'Invalid stored card-cycle state';
  end if;
  cycle_pool := coalesce(h->'card_cycles'->p_pool,'{}'::jsonb);
  if pg_catalog.jsonb_typeof(cycle_pool) is distinct from 'object' then
    raise exception 'Invalid stored card-cycle pool';
  end if;
  foreach tier_name in array array['Bronze','Silver','Gold','Elite','Icon'] loop
    tier_cards := coalesce(cycle_pool->tier_name,'[]'::jsonb);
    if pg_catalog.jsonb_typeof(tier_cards) is distinct from 'array' then
      raise exception 'Invalid stored card-cycle tier';
    end if;
    for card_entry in select value from pg_catalog.jsonb_array_elements(tier_cards) loop
      card_text := card_entry #>> '{}';
      if pg_catalog.jsonb_typeof(card_entry) is distinct from 'number'
        or card_text is null or card_text !~ '^[0-9]+$' or card_text::numeric > 2147483647 then
        raise exception 'Invalid stored card-cycle card';
      end if;
    end loop;
    cycle_pool := pg_catalog.jsonb_set(cycle_pool,array[tier_name],tier_cards,true);
    all_shown := all_shown || tier_cards;
  end loop;
  if (select pg_catalog.count(*) from pg_catalog.jsonb_array_elements(all_shown))
    <> (select pg_catalog.count(distinct value) from pg_catalog.jsonb_array_elements(all_shown)) then
    raise exception 'Duplicate stored card-cycle card';
  end if;
  -- The tier arrays are chronological. Keep their order so positional scarcity
  -- can release the oldest eligible exact card, not the lowest numeric ID.
  shown := all_shown;
  snapshot := pg_catalog.jsonb_build_object('kind','card-cycle-rarity-v1','releaseFractions',p_release_fractions,'shown',shown);

  h := pg_catalog.jsonb_set(h,'{card_cycles}',coalesce(h->'card_cycles','{}'::jsonb),true);
  h := pg_catalog.jsonb_set(h,array['card_cycles',p_pool],cycle_pool,true);
  h := pg_catalog.jsonb_set(h,'{card_cycle_active}',coalesce(h->'card_cycle_active','{}'::jsonb),true);
  active := h->'card_cycle_active'->p_pool;
  if active is null or active->>'createdAt' is null or r.created_at >= (active->>'createdAt')::timestamptz then
    h := pg_catalog.jsonb_set(h,array['card_cycle_active',p_pool],
      pg_catalog.jsonb_build_object('runId',r.id,'createdAt',r.created_at),true);
  end if;
  update public.draft_offer_history set state=h,updated_at=pg_catalog.now() where user_id=p_user_id;
  update public.game_runs set draft_fairness=snapshot where id=p_run_id;
  return snapshot;
end;
$$;


revoke all on function public.initialize_card_cycle_rarity(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.initialize_card_cycle_rarity(uuid,uuid,text,jsonb) to service_role;

-- Both policies share the chronological exact-card history and the existing
-- idempotent active-run journal. Only version recognition changes here.
do $recorder$
declare
  definition text;
begin
  definition := pg_catalog.pg_get_functiondef('public.record_card_cycle(uuid,uuid,jsonb)'::regprocedure);
  if pg_catalog.md5(definition)<>'486a1753d421e9ca63face7ab95c91af' then
    raise exception 'Card cycle recorder differs from the inspected baseline';
  end if;
  definition := pg_catalog.replace(definition,
    'r.rules_version not in (''atu-classic-v12'',''atu-history-draft-v10'')',
    'r.rules_version not in (''atu-classic-v12'',''atu-history-draft-v10'',''atu-classic-v13'',''atu-history-draft-v11'')');
  definition := pg_catalog.replace(definition,
    'if r.draft_fairness->>''kind'' is distinct from ''card-cycle-v1'' then',
    'if r.draft_fairness->>''kind'' is distinct from (case when r.rules_version in (''atu-classic-v13'',''atu-history-draft-v11'') then ''card-cycle-rarity-v1'' else ''card-cycle-v1'' end) then');
  definition := pg_catalog.replace(definition,
    'pool_name := case when r.rules_version=''atu-classic-v12'' then ''modern'' else ''history'' end;',
    'pool_name := case when r.rules_version in (''atu-classic-v12'',''atu-classic-v13'') then ''modern'' else ''history'' end;');
  execute definition;
end;
$recorder$;

notify pgrst,'reload schema';
commit;
