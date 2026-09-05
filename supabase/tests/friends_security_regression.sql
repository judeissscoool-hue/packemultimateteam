-- Temporary users only. Every row, counter and timestamp change is rolled back.
begin;
do $test$
declare player_id uuid; player_public_id uuid; label text;
begin
  foreach label in array array['a','b','c'] loop
    player_id := extensions.gen_random_uuid();
    insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
      values (player_id,'authenticated','authenticated',player_id::text || '@example.invalid','{}','{}',now(),now(),false,false);
    update public.profiles set username = 'Test_' || pg_catalog.left(pg_catalog.replace(player_id::text,'-',''),15) where id=player_id
      returning public_id into player_public_id;
    perform set_config('atu.test_' || label, player_id::text, true);
    perform set_config('atu.public_' || label, player_public_id::text, true);
    perform set_config('atu.name_' || label, (select username from public.profiles where id=player_id), true);
  end loop;
end;
$test$;

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('atu.test_a'),true);
do $test$
begin
  if public.request_friend(current_setting('atu.name_a')) <> 'self' then raise exception 'Self request accepted'; end if;
  if public.request_friend('DoesNotExist_1234') <> 'not_found' then raise exception 'Missing player not handled'; end if;
  if public.request_friend(lower(current_setting('atu.name_b'))) <> 'sent' then raise exception 'Case-insensitive request failed'; end if;
  if public.request_friend(current_setting('atu.name_b')) <> 'pending' then raise exception 'Duplicate request not idempotent'; end if;
  perform public.touch_presence();
  if not exists (select 1 from public.get_friends() where relationship='outgoing' and is_online is null) then raise exception 'Pending request exposed status'; end if;
  if public.change_friendship(current_setting('atu.public_b')::uuid,'accept') <> 'not_allowed' then raise exception 'Sender accepted own request'; end if;
  if public.change_friendship(current_setting('atu.public_b')::uuid,'decline') <> 'not_allowed' then raise exception 'Sender declined own request'; end if;
  begin
    perform * from social_private.friendships;
    raise exception 'Raw friendships readable';
  exception when insufficient_privilege then null; end;
  begin
    perform * from social_private.presence;
    raise exception 'Raw presence readable';
  exception when insufficient_privilege then null; end;
  begin
    update social_private.presence set seen_at=now()+interval '1 day';
    raise exception 'Browser can forge presence timestamps';
  exception when insufficient_privilege then null; end;
  begin
    perform * from social_private.request_limits;
    raise exception 'Raw rate limits readable';
  exception when insufficient_privilege then null; end;
end;
$test$;

select set_config('request.jwt.claim.sub',current_setting('atu.test_b'),true);
do $test$
begin
  perform public.touch_presence();
  if public.request_friend(current_setting('atu.name_a')) <> 'incoming' then raise exception 'Crossed request skipped acceptance'; end if;
  if public.change_friendship(current_setting('atu.public_a')::uuid,'cancel') <> 'not_allowed' then raise exception 'Recipient cancelled sender request'; end if;
  if not exists (select 1 from public.get_friends() where relationship='incoming' and is_online is null) then raise exception 'Incoming request exposed status'; end if;
  if public.change_friendship(current_setting('atu.public_a')::uuid,'accept') <> 'accepted' then raise exception 'Recipient cannot accept'; end if;
  if not exists (select 1 from public.get_friends() where relationship='accepted' and is_online) then raise exception 'Accepted friend not online'; end if;
end;
$test$;

select set_config('request.jwt.claim.sub',current_setting('atu.test_c'),true);
do $test$
begin
  if exists (select 1 from public.get_friends()) then raise exception 'Stranger saw a friendship'; end if;
  if public.change_friendship(current_setting('atu.public_b')::uuid,'remove') <> 'not_found' then raise exception 'Stranger modified friendship'; end if;
  if public.request_friend(current_setting('atu.name_b')) <> 'sent' then raise exception 'Stranger request failed'; end if;
  if exists (select 1 from public.get_friends() where is_online is not null) then raise exception 'Pending request saw online player'; end if;
end;
$test$;

reset role;
update social_private.presence set seen_at=now()-interval '91 seconds' where user_id=current_setting('atu.test_b')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('atu.test_a'),true);
do $test$
begin
  if public.request_friend(current_setting('atu.name_b')) <> 'already_friends' then raise exception 'Accepted friendship not idempotent'; end if;
  if exists (select 1 from public.get_friends() where is_online) then raise exception 'Stale presence did not expire'; end if;
  if public.change_friendship(current_setting('atu.public_b')::uuid,'remove') <> 'removed' then raise exception 'Remove friend failed'; end if;
  if exists (select 1 from public.get_friends()) then raise exception 'Removed friend still visible'; end if;
  if public.request_friend(current_setting('atu.name_b')) <> 'sent' then raise exception 'New request failed'; end if;
  if public.change_friendship(current_setting('atu.public_b')::uuid,'cancel') <> 'removed' then raise exception 'Cancel failed'; end if;
  if public.request_friend(current_setting('atu.name_b')) <> 'sent' then raise exception 'Request after cancellation failed'; end if;
end;
$test$;
select set_config('request.jwt.claim.sub',current_setting('atu.test_b'),true);
do $test$
begin
  if public.change_friendship(current_setting('atu.public_a')::uuid,'decline') <> 'removed' then raise exception 'Decline failed'; end if;
  if exists (select 1 from public.get_friends() where friend_public_id=current_setting('atu.public_a')::uuid) then raise exception 'Declined sender remains visible'; end if;
end;
$test$;

reset role;
update social_private.request_limits set sent=20,window_start=now() where user_id=current_setting('atu.test_a')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('atu.test_a'),true);
do $test$
begin
  begin
    perform public.request_friend(current_setting('atu.name_b'));
    raise exception 'Request rate limit was bypassed' using errcode='P9999';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Friend request rate limit' then raise; end if;
  end;
end;
$test$;

-- The hourly limit recovers without losing a new relationship.
reset role;
update social_private.request_limits set window_start=now()-interval '61 minutes' where user_id=current_setting('atu.test_a')::uuid;
set local role authenticated;
do $test$
begin
  if public.request_friend(current_setting('atu.name_b')) <> 'sent' then raise exception 'Hourly request counter did not reset'; end if;
end;
$test$;
reset role;
do $test$
begin
  if (select sent from social_private.request_limits where user_id=current_setting('atu.test_a')::uuid) <> 1 then raise exception 'New hourly window retained the old count'; end if;
end;
$test$;

-- All APIs deny anonymous callers, including the private entrypoints.
set local role anon;
do $test$
begin
  begin perform public.get_friends(); raise exception 'Anonymous friends access'; exception when insufficient_privilege then null; end;
  begin perform public.touch_presence(); raise exception 'Anonymous presence access'; exception when insufficient_privilege then null; end;
  begin perform public.request_friend('Someone'); raise exception 'Anonymous request access'; exception when insufficient_privilege then null; end;
  begin perform public.change_friendship(null,'accept'); raise exception 'Anonymous mutation access'; exception when insufficient_privilege then null; end;
  begin perform social_private.get_friends(); raise exception 'Private function exposed anonymously'; exception when insufficient_privilege then null; end;
end;
$test$;
set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
do $test$
begin
  begin perform public.get_friends(); raise exception 'Missing identity accepted'; exception when sqlstate '28000' then null; end;
end;
$test$;

reset role;
delete from auth.users where id=current_setting('atu.test_a')::uuid;
do $test$
begin
  if exists (select 1 from social_private.presence where user_id=current_setting('atu.test_a')::uuid)
    or exists (select 1 from social_private.request_limits where user_id=current_setting('atu.test_a')::uuid)
    or exists (select 1 from social_private.friendships where player_a=current_setting('atu.test_a')::uuid or player_b=current_setting('atu.test_a')::uuid)
    then raise exception 'Account deletion did not clean up social data'; end if;
end;
$test$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('atu.test_a'),true);
do $test$
begin
  begin
    perform public.touch_presence();
    raise exception 'Deleted player accepted' using errcode='P9999';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Choose a username first' then raise; end if;
  end;
end;
$test$;
reset role;
select 'Friend requests, consent, privacy, rate limits, presence expiry and deletion passed' as result;
rollback;
