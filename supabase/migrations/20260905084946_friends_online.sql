-- Additive only: existing Auth, saves, challenge validation and scoring are unchanged.
create schema social_private;
revoke all on schema social_private from public, anon, authenticated;
grant usage on schema social_private to authenticated;

create table social_private.friendships (
  player_a uuid not null references public.profiles(id) on delete cascade,
  player_b uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  primary key (player_a, player_b),
  check (player_a < player_b),
  check (requested_by in (player_a, player_b))
);
create index friendships_player_b_idx on social_private.friendships (player_b);
create index friendships_requested_by_idx on social_private.friendships (requested_by);

create table social_private.presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  seen_at timestamptz not null default pg_catalog.now()
);

-- One counter per player, retained when requests are declined/cancelled.
create table social_private.request_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  window_start timestamptz not null,
  sent integer not null check (sent > 0)
);

alter table social_private.friendships enable row level security;
alter table social_private.presence enable row level security;
alter table social_private.request_limits enable row level security;
revoke all on all tables in schema social_private from public, anon, authenticated;

create function social_private.require_player()
returns uuid language plpgsql stable security invoker set search_path = '' as $$
declare caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles p where p.id = caller_id and p.username is not null) then
    raise exception 'Choose a username first' using errcode = 'P0001';
  end if;
  return caller_id;
end;
$$;

create function social_private.request_friend(p_username text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := social_private.require_player();
  target_id uuid;
  low_id uuid;
  high_id uuid;
  existing social_private.friendships%rowtype;
  sent_count integer;
begin
  if p_username is null or pg_catalog.btrim(p_username) !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Invalid username' using errcode = '22023';
  end if;
  select p.id into target_id from public.profiles p
    where p.username is not null and pg_catalog.lower(p.username) = pg_catalog.lower(pg_catalog.btrim(p_username));
  if target_id is null then return 'not_found'; end if;
  if target_id = caller_id then return 'self'; end if;
  low_id := least(caller_id, target_id);
  high_id := greatest(caller_id, target_id);
  -- Lock in stable order to enforce limits even under simultaneous/crossed requests.
  perform p.id from public.profiles p where p.id in (low_id, high_id) order by p.id for update;
  select f.* into existing from social_private.friendships f where f.player_a = low_id and f.player_b = high_id;
  if found then
    if existing.status = 'accepted' then return 'already_friends'; end if;
    if existing.requested_by = caller_id then return 'pending'; end if;
    return 'incoming'; -- A crossed request still needs explicit acceptance.
  end if;
  if (select pg_catalog.count(*) from social_private.friendships f where f.player_a = caller_id or f.player_b = caller_id) >= 100
    or (select pg_catalog.count(*) from social_private.friendships f where f.player_a = target_id or f.player_b = target_id) >= 100 then
    return 'full';
  end if;
  insert into social_private.request_limits as limits (user_id, window_start, sent)
    values (caller_id, pg_catalog.now(), 1)
    on conflict (user_id) do update set
      window_start = case when limits.window_start <= pg_catalog.now() - interval '1 hour' then pg_catalog.now() else limits.window_start end,
      sent = case when limits.window_start <= pg_catalog.now() - interval '1 hour' then 1 else limits.sent + 1 end
    returning sent into sent_count;
  if sent_count > 20 then raise exception 'Friend request rate limit' using errcode = 'P0001'; end if;
  insert into social_private.friendships (player_a, player_b, requested_by) values (low_id, high_id, caller_id);
  return 'sent';
end;
$$;

create function social_private.change_friendship(p_friend_public_id uuid, p_action text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := social_private.require_player();
  target_id uuid;
  existing social_private.friendships%rowtype;
begin
  if p_action is null or p_action not in ('accept', 'decline', 'cancel', 'remove') then
    raise exception 'Invalid friend action' using errcode = '22023';
  end if;
  select p.id into target_id from public.profiles p where p.public_id = p_friend_public_id;
  if target_id is null or target_id = caller_id then return 'not_found'; end if;
  select f.* into existing from social_private.friendships f
    where f.player_a = least(caller_id, target_id) and f.player_b = greatest(caller_id, target_id) for update;
  if not found then return 'not_found'; end if;
  if p_action in ('accept', 'decline') and (existing.status <> 'pending' or existing.requested_by = caller_id)
    or p_action = 'cancel' and (existing.status <> 'pending' or existing.requested_by <> caller_id)
    or p_action = 'remove' and existing.status <> 'accepted' then
    return 'not_allowed';
  end if;
  if p_action = 'accept' then
    update social_private.friendships f set status = 'accepted'
      where f.player_a = existing.player_a and f.player_b = existing.player_b;
    return 'accepted';
  end if;
  delete from social_private.friendships f where f.player_a = existing.player_a and f.player_b = existing.player_b;
  return 'removed';
end;
$$;

create function social_private.get_friends()
returns table (friend_public_id uuid, username text, relationship text, is_online boolean)
language plpgsql stable security definer set search_path = '' as $$
declare caller_id uuid := social_private.require_player();
begin
  return query
  select p.public_id, p.username,
    case when f.status = 'accepted' then 'accepted' when f.requested_by = caller_id then 'outgoing' else 'incoming' end,
    case when f.status = 'accepted' then coalesce(s.seen_at > pg_catalog.now() - interval '90 seconds', false) else null end
  from social_private.friendships f
  join public.profiles p on p.id = case when f.player_a = caller_id then f.player_b else f.player_a end
  left join social_private.presence s on s.user_id = p.id and f.status = 'accepted'
  where f.player_a = caller_id or f.player_b = caller_id
  order by f.status, pg_catalog.lower(p.username)
  limit 100;
end;
$$;

create function social_private.touch_presence()
returns void language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := social_private.require_player();
begin
  -- The browser supplies neither an account ID nor a timestamp.
  insert into social_private.presence as activity (user_id, seen_at) values (caller_id, pg_catalog.now())
    on conflict (user_id) do update set seen_at = pg_catalog.now()
    where activity.seen_at < pg_catalog.now() - interval '20 seconds';
end;
$$;

revoke all on all functions in schema social_private from public, anon, authenticated;
grant execute on function social_private.request_friend(text), social_private.change_friendship(uuid, text),
  social_private.get_friends(), social_private.touch_presence() to authenticated;

-- Public entrypoints run as the caller; privileged bodies stay in an unexposed schema.
create function public.request_friend(p_username text)
returns text language sql security invoker set search_path = ''
as $$ select social_private.request_friend(p_username); $$;
create function public.change_friendship(p_friend_public_id uuid, p_action text)
returns text language sql security invoker set search_path = ''
as $$ select social_private.change_friendship(p_friend_public_id, p_action); $$;
create function public.get_friends()
returns table (friend_public_id uuid, username text, relationship text, is_online boolean)
language sql stable security invoker set search_path = ''
as $$ select * from social_private.get_friends(); $$;
create function public.touch_presence()
returns void language sql security invoker set search_path = ''
as $$ select social_private.touch_presence(); $$;

revoke all on function public.request_friend(text), public.change_friendship(uuid, text),
  public.get_friends(), public.touch_presence() from public, anon, authenticated;
grant execute on function public.request_friend(text), public.change_friendship(uuid, text),
  public.get_friends(), public.touch_presence() to authenticated;
