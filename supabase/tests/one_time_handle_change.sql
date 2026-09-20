-- Disposable test accounts; always roll back.
begin;
do $$
declare uid uuid := extensions.gen_random_uuid();
begin
  insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
  values(uid,'authenticated','authenticated',uid::text || '@example.invalid','{}','{}',now(),now(),false,false);
  perform set_config('request.jwt.claim.sub',uid::text,true);
end;
$$;
set local role authenticated;
do $$
declare base text := 'T' || left(replace(auth.uid()::text,'-',''),15);
begin
  if not public.get_my_username_change_available() then raise exception 'Initial availability missing'; end if;
  perform public.set_username(base);
  perform public.set_username(base);
  if not public.get_my_username_change_available() then raise exception 'Initial choice or same-name save consumed change'; end if;
  begin
    perform public.set_username('!');
    raise exception 'Invalid name accepted';
  exception when invalid_parameter_value then null; end;
  if not public.get_my_username_change_available() then raise exception 'Failed update consumed change'; end if;
  perform public.set_username(base || 'x');
  if public.get_my_username_change_available() then raise exception 'Rename did not consume change'; end if;
  perform public.set_username(base || 'x');
  perform public.update_profile('Still editable',null);
  begin
    perform public.set_username(base || 'y');
    raise exception 'Second rename accepted';
  exception when invalid_parameter_value then null; end;
  begin
    update public.profiles set username_changed_at=null where id=auth.uid();
    raise exception 'Client reset marker';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
do $$
begin
  update public.profiles set username_changed_at=null where id=auth.uid();
  if public.get_my_username_change_available() then raise exception 'Marker reset through direct update'; end if;
end;
$$;
set local role anon;
do $$
begin
  begin
    perform public.get_my_username_change_available();
    raise exception 'Anonymous status access allowed';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
select 'Handle regression checks passed' as result;
rollback;
