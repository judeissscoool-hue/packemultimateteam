begin;

insert into public.rulesets(version,validator_version,enabled) values
('atu-classic-v12','atu-card-cycle-v1',true),
('atu-history-draft-v10','atu-card-cycle-v1',true)
on conflict(version) do nothing;

-- Extend only the inspected Classic version allowlists. Preserve existing
-- function bodies, ownership, security modes, grants and prior draft rules.
do $migration$
declare
  signature text;
  definition text;
  old_list text := '(''atu-classic-v2'', ''atu-classic-v3'', ''atu-history-draft-v1'', ''atu-classic-v4'', ''atu-history-draft-v2'', ''atu-classic-v5'', ''atu-history-draft-v3'',''atu-classic-v6'',''atu-history-draft-v4'',''atu-classic-v7'',''atu-history-draft-v5'',''atu-classic-v8'',''atu-history-draft-v6'',''atu-classic-v9'',''atu-history-draft-v7'',''atu-classic-v10'',''atu-history-draft-v8'',''atu-classic-v11'',''atu-history-draft-v9'')';
  new_list text;
begin
  new_list := pg_catalog.left(old_list,-1) || ',''atu-classic-v12'',''atu-history-draft-v10'')';
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
  if (select count(*) from public.rulesets where version in ('atu-classic-v12','atu-history-draft-v10') and validator_version='atu-card-cycle-v1' and enabled)<>2 then
    raise exception 'Card cycle rules registration mismatch';
  end if;
end;
$migration$;
-- Existing history counters, old RPC bodies, RLS and application-role grants
-- remain unchanged. Only a trusted handler may submit replayed cycle events.

alter table public.game_runs
  add column card_cycle_recorded jsonb not null default '[]'::jsonb;

create function public.initialize_card_cycle(
  p_run_id uuid,
  p_user_id uuid,
  p_pool text,
  p_release_fraction numeric default 0.75
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
begin
  if p_pool is null or p_pool not in ('modern','history') then
    raise exception 'Invalid card-cycle pool';
  end if;
  if p_release_fraction is null or p_release_fraction <= 0 or p_release_fraction > 1 then
    raise exception 'Invalid card-cycle release fraction';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,8134101));
  select * into r from public.game_runs where id=p_run_id and user_id=p_user_id for update;
  if not found or r.mode <> 'draft' or r.status <> 'started' or r.expires_at <= pg_catalog.now()
    or r.rules_version not in ('atu-classic-v12','atu-history-draft-v10') then
    raise exception 'Active card-cycle draft not found';
  end if;
  expected_pool := case when r.rules_version='atu-classic-v12' then 'modern' else 'history' end;
  if p_pool <> expected_pool then raise exception 'Card-cycle pool does not match rules'; end if;

  -- Retrying initialization returns the original replay snapshot and must never
  -- reactivate an older run after a newer run has become active.
  if r.draft_fairness is not null then
    if r.draft_fairness->>'kind' is distinct from 'card-cycle-v1' then
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
  snapshot := pg_catalog.jsonb_build_object('kind','card-cycle-v1','releaseFraction',p_release_fraction,'shown',shown);

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

create function public.record_card_cycle(p_run_id uuid,p_user_id uuid,p_events jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  r public.game_runs%rowtype;
  h jsonb;
  pool_name text;
  cycle_pool jsonb;
  tier_cards jsonb;
  previous_events jsonb;
  previous_length integer;
  incoming_length integer;
  event_index integer;
  entry jsonb;
  event_type text;
  tier_name text;
  card_text text;
  card_id integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,8134101));
  select * into r from public.game_runs where id=p_run_id and user_id=p_user_id for update;
  if not found or r.mode <> 'draft' or r.rules_version not in ('atu-classic-v12','atu-history-draft-v10') then
    raise exception 'Card-cycle draft not found';
  end if;
  if r.draft_fairness->>'kind' is distinct from 'card-cycle-v1' then
    raise exception 'Card-cycle draft is not initialized';
  end if;
  if pg_catalog.jsonb_typeof(p_events) is distinct from 'array'
    or pg_catalog.octet_length(p_events::text)>65536 then
    raise exception 'Invalid card-cycle events';
  end if;
  incoming_length := pg_catalog.jsonb_array_length(p_events);
  if incoming_length>256 then raise exception 'Too many card-cycle events'; end if;
  previous_events := r.card_cycle_recorded;
  if pg_catalog.jsonb_typeof(previous_events) is distinct from 'array' then
    raise exception 'Invalid stored card-cycle journal';
  end if;
  previous_length := pg_catalog.jsonb_array_length(previous_events);

  -- Retried and out-of-order older cumulative checkpoints cannot double count.
  -- A longer checkpoint must extend the recorded prefix exactly.
  if incoming_length<=previous_length then return; end if;
  if previous_length>0 then
    for event_index in 0..previous_length-1 loop
      if p_events->event_index is distinct from previous_events->event_index then
        raise exception 'Card-cycle checkpoint diverged';
      end if;
    end loop;
  end if;

  pool_name := case when r.rules_version='atu-classic-v12' then 'modern' else 'history' end;
  select state into h from public.draft_offer_history where user_id=p_user_id for update;
  if not found then raise exception 'Card-cycle history not initialized'; end if;

  -- An earlier run stays independently replayable, but cannot clear protection
  -- established by the currently active run. Sequential restarts flush the old
  -- transcript before initializing the replacement run.
  if h->'card_cycle_active'->pool_name->>'runId' is distinct from r.id::text then return; end if;
  cycle_pool := h->'card_cycles'->pool_name;
  if pg_catalog.jsonb_typeof(cycle_pool) is distinct from 'object' then
    raise exception 'Invalid stored card-cycle pool';
  end if;

  for event_index in previous_length..incoming_length-1 loop
    entry := p_events->event_index;
    event_type := entry->>'type';
    tier_name := entry->>'tier';
    if pg_catalog.jsonb_typeof(entry) is distinct from 'object'
      or event_type is null or event_type not in ('offer','reset','release')
      or tier_name is null or tier_name not in ('Bronze','Silver','Gold','Elite','Icon') then
      raise exception 'Invalid card-cycle event';
    end if;
    tier_cards := coalesce(cycle_pool->tier_name,'[]'::jsonb);
    if pg_catalog.jsonb_typeof(tier_cards) is distinct from 'array' then
      raise exception 'Invalid stored card-cycle tier';
    end if;
    if event_type='reset' then
      tier_cards := '[]'::jsonb;
    else
      card_text := entry->>'cardId';
      if pg_catalog.jsonb_typeof(entry->'cardId') is distinct from 'number'
        or card_text is null or card_text !~ '^[0-9]+$' or card_text::numeric > 2147483647 then
        raise exception 'Invalid card-cycle card';
      end if;
      card_id := card_text::integer;
      if event_type='release' then
        select coalesce(pg_catalog.jsonb_agg(value order by ordinality),'[]'::jsonb)
          into tier_cards
          from pg_catalog.jsonb_array_elements(tier_cards) with ordinality
          where value<>pg_catalog.to_jsonb(card_id);
      elsif not tier_cards @> pg_catalog.jsonb_build_array(card_id) then
        tier_cards := tier_cards || pg_catalog.jsonb_build_array(card_id);
      end if;
    end if;
    cycle_pool := pg_catalog.jsonb_set(cycle_pool,array[tier_name],tier_cards,true);
  end loop;
  h := pg_catalog.jsonb_set(h,array['card_cycles',pool_name],cycle_pool,true);
  update public.draft_offer_history set state=h,updated_at=pg_catalog.now() where user_id=p_user_id;
  update public.game_runs set card_cycle_recorded=p_events where id=p_run_id;
end;
$$;

revoke all on function public.initialize_card_cycle(uuid,uuid,text,numeric) from public,anon,authenticated;
revoke all on function public.record_card_cycle(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.initialize_card_cycle(uuid,uuid,text,numeric) to service_role;
grant execute on function public.record_card_cycle(uuid,uuid,jsonb) to service_role;

-- Concurrency limit: these RPCs serialize history snapshots and journals; they
-- do not reserve unrevealed future boards across devices. If a second run starts,
-- the earlier run's new checkpoints are ignored while its immutable transcript
-- remains valid for replay. Late old resets cannot erase the new active cycle.

notify pgrst,'reload schema';
commit;
