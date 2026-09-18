begin;

-- Only the trusted Edge Function can write account history or run snapshots.
create table public.draft_offer_history (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{"session":0,"shown":{},"last":{},"cards":{}}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.draft_offer_history enable row level security;
revoke all on public.draft_offer_history from public, anon, authenticated;
grant select, insert, update, delete on public.draft_offer_history to service_role;

alter table public.game_runs add column draft_fairness jsonb;
alter table public.game_runs add column draft_exposure jsonb not null default '{"names":{},"cards":{}}'::jsonb;

create function public.initialize_draft_fairness(p_run_id uuid, p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  r public.game_runs%rowtype;
  h jsonb;
  next_session integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 8134101));
  select * into r from public.game_runs where id=p_run_id and user_id=p_user_id for update;
  if not found or r.mode <> 'draft' or r.status <> 'started' or r.expires_at <= now()
    or r.rules_version not in ('atu-classic-v4','atu-history-draft-v2') then
    raise exception 'Active current draft not found';
  end if;
  if r.draft_fairness is not null then return r.draft_fairness; end if;
  insert into public.draft_offer_history(user_id) values(p_user_id) on conflict do nothing;
  select state into h from public.draft_offer_history where user_id=p_user_id for update;
  next_session := (h->>'session')::integer + 1;
  -- Same bounded exposure history as local drafts. Recency uses session numbers.
  if next_session % 100 = 0 then
    h := pg_catalog.jsonb_set(h,'{shown}',coalesce((select pg_catalog.jsonb_object_agg(key, floor(value::numeric * .75)) from pg_catalog.jsonb_each_text(h->'shown')), '{}'::jsonb));
    h := pg_catalog.jsonb_set(h,'{cards}',coalesce((select pg_catalog.jsonb_object_agg(key, floor(value::numeric * .75)) from pg_catalog.jsonb_each_text(h->'cards')), '{}'::jsonb));
  end if;
  h := pg_catalog.jsonb_set(h,'{session}',pg_catalog.to_jsonb(next_session));
  update public.draft_offer_history set state=h, updated_at=now() where user_id=p_user_id;
  update public.game_runs set draft_fairness=h where id=p_run_id;
  return h;
end;
$$;

create function public.record_draft_exposure(p_run_id uuid, p_user_id uuid, p_exposure jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  r public.game_runs%rowtype;
  h jsonb;
  bucket text;
  history_bucket text;
  entry record;
  previous_count integer;
  incoming_count integer;
  run_session integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 8134101));
  select * into r from public.game_runs where id=p_run_id and user_id=p_user_id for update;
  if not found or r.mode <> 'draft' or r.rules_version not in ('atu-classic-v4','atu-history-draft-v2') then
    raise exception 'Current draft not found';
  end if;
  if pg_catalog.jsonb_typeof(p_exposure->'names') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_exposure->'cards') is distinct from 'object'
    or pg_catalog.octet_length(p_exposure::text)>32768 then raise exception 'Invalid exposure'; end if;
  insert into public.draft_offer_history(user_id) values(p_user_id) on conflict do nothing;
  select state into h from public.draft_offer_history where user_id=p_user_id for update;
  run_session := coalesce((r.draft_fairness->>'session')::integer,(h->>'session')::integer);
  foreach bucket in array array['names','cards'] loop
    history_bucket := case when bucket='names' then 'shown' else 'cards' end;
    for entry in select key,value from pg_catalog.jsonb_each_text(p_exposure->bucket) loop
      incoming_count := entry.value::integer;
      if incoming_count < 1 or incoming_count > 38 or length(entry.key)>150 then raise exception 'Invalid exposure count'; end if;
      previous_count := coalesce((r.draft_exposure->bucket->>entry.key)::integer,0);
      -- Retries and delayed older checkpoints never double-count or reduce history.
      if incoming_count > previous_count then
        h := pg_catalog.jsonb_set(h,array[history_bucket,entry.key],pg_catalog.to_jsonb(coalesce((h->history_bucket->>entry.key)::integer,0)+incoming_count-previous_count));
        r.draft_exposure := pg_catalog.jsonb_set(r.draft_exposure,array[bucket,entry.key],pg_catalog.to_jsonb(incoming_count));
        if bucket='names' then
          h := pg_catalog.jsonb_set(h,array['last',entry.key],pg_catalog.to_jsonb(greatest(coalesce((h->'last'->>entry.key)::integer,0),run_session)));
        end if;
      end if;
    end loop;
  end loop;
  update public.draft_offer_history set state=h, updated_at=now() where user_id=p_user_id;
  update public.game_runs set draft_exposure=r.draft_exposure where id=p_run_id;
end;
$$;
revoke all on function public.initialize_draft_fairness(uuid,uuid) from public, anon, authenticated;
revoke all on function public.record_draft_exposure(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.initialize_draft_fairness(uuid,uuid) to service_role;
grant execute on function public.record_draft_exposure(uuid,uuid,jsonb) to service_role;
commit;
