begin;
alter table public.profiles add column username_changed_at timestamptz;

create function app_private.enforce_one_username_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- The marker is server-owned and cannot be reset, including by an old client.
  new.username_changed_at := old.username_changed_at;
  if new.username is distinct from old.username and old.username is not null then
    if old.username_changed_at is not null then
      raise exception 'Your handle can only be changed once.' using errcode = '22023';
    end if;
    if new.username is null then
      raise exception 'Your handle cannot be cleared.' using errcode = '22023';
    end if;
    new.username_changed_at := pg_catalog.now();
  end if;
  return new;
end;
$$;
revoke all on function app_private.enforce_one_username_change() from public, anon, authenticated;
create trigger profiles_one_username_change before update on public.profiles
for each row execute function app_private.enforce_one_username_change();

-- Profiles are server-only; expose only the caller's availability, not raw rows.
create function public.get_my_username_change_available()
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  return coalesce((select p.username_changed_at is null from public.profiles p where p.id = auth.uid()), false);
end;
$$;
revoke all on function public.get_my_username_change_available() from public, anon;
grant execute on function public.get_my_username_change_available() to authenticated;
commit;
