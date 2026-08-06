-- Rollback-only integration test for the async backend migration.
-- It creates two temporary Auth users, exercises the RPC lifecycle, asserts security
-- invariants, and removes every test row with the final ROLLBACK.

begin;

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values (
  '10000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'atu-migration-test-1@example.invalid',
  '{}'::jsonb,
  jsonb_build_object(
    'full_name', repeat('A', 80),
    'avatar_url', 'javascript:alert(1)'
  ),
  now(), now(), false, false
);

do $test$
begin
  if not exists (
    select 1 from public.profiles
    where id = '10000000-0000-0000-0000-000000000001'
      and char_length(display_name) = 40
      and avatar_url is null
  ) then
    raise exception 'profile trigger sanitization failed';
  end if;
end
$test$;

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select * from public.set_username('Player_One');

create temporary table test_save_created as
select * from public.sync_cloud_save(
  0, 4, '{"progress":1}'::jsonb, now(), '20000000-0000-0000-0000-000000000001'
);

create temporary table test_save_conflict as
select * from public.sync_cloud_save(
  0, 4, '{"progress":999}'::jsonb, now(), '20000000-0000-0000-0000-000000000002'
);

create temporary table test_save_updated as
select * from public.sync_cloud_save(
  1, 4, '{"progress":2}'::jsonb, now(), null
);

do $test$
begin
  if (select outcome from test_save_created) <> 'created'
    or (select revision from test_save_created) <> 1 then
    raise exception 'cloud save creation failed';
  end if;

  if (select outcome from test_save_conflict) <> 'conflict'
    or (select revision from test_save_conflict) <> 1
    or (select payload ->> 'progress' from test_save_conflict) <> '1' then
    raise exception 'cloud save conflict protection failed';
  end if;

  if (select outcome from test_save_updated) <> 'updated'
    or (select revision from test_save_updated) <> 2
    or (select payload ->> 'progress' from test_save_updated) <> '2' then
    raise exception 'cloud save compare-and-swap update failed';
  end if;
end
$test$;

create temporary table test_challenge as
select * from public.create_async_challenge('atu-v1');

do $test$
begin
  if (select count(*) from public.get_async_challenge_invitation(
    (select challenge_code from test_challenge)
  )) <> 0 then
    raise exception 'unfinished creator challenge was exposed';
  end if;
end
$test$;

create temporary table test_creator_finalized as
select * from public.finalize_validated_run(
  (select run_id from test_challenge),
  '10000000-0000-0000-0000-000000000001',
  (select run_token from test_challenge),
  '{"PG":1}'::jsonb,
  '[]'::jsonb,
  100,
  95,
  80::smallint,
  repeat('a', 64)
);

do $test$
begin
  if (select outcome from test_creator_finalized) <> 'creator_completed'
    or (select challenge_status from test_creator_finalized) <> 'open' then
    raise exception 'creator challenge finalization failed';
  end if;

  if (select count(*) from public.get_async_challenge_invitation(
    (select challenge_code from test_challenge)
  )) <> 1 then
    raise exception 'validated challenge invitation was not exposed';
  end if;
end
$test$;

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values (
  '10000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'atu-migration-test-2@example.invalid',
  '{}'::jsonb,
  '{}'::jsonb,
  now(), now(), false, false
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select * from public.set_username('Player_Two');

create temporary table test_accept as
select * from public.accept_async_challenge(
  (select challenge_code from test_challenge)
);

do $test$
begin
  if not (select accepted from test_accept)
    or (select draft_seed from test_accept) <> (select draft_seed from test_challenge) then
    raise exception 'challenge acceptance or delayed seed release failed';
  end if;
end
$test$;

create temporary table test_opponent_finalized as
select * from public.finalize_validated_run(
  (select run_id from test_accept),
  '10000000-0000-0000-0000-000000000002',
  (select run_token from test_accept),
  '{"PG":2}'::jsonb,
  '[]'::jsonb,
  90,
  92,
  76::smallint,
  repeat('b', 64)
);

do $test$
begin
  if (select outcome from test_opponent_finalized) <> 'challenge_completed'
    or (select challenge_status from test_opponent_finalized) <> 'completed' then
    raise exception 'opponent challenge finalization failed';
  end if;

  if (select status from public.async_challenges
      where id = (select challenge_id from test_challenge)) <> 'completed' then
    raise exception 'challenge did not close';
  end if;

  if (select winner_id from public.async_challenges
      where id = (select challenge_id from test_challenge))
      <> '10000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'challenge winner calculation failed';
  end if;

  if (select count(*) from public.leaderboard_entries
      where challenge_id = (select challenge_id from test_challenge)) <> 2 then
    raise exception 'verified 1v1 leaderboard rows were not written';
  end if;

  if (select count(*) from public.get_async_challenge_result(
      (select challenge_code from test_challenge)
  )) <> 2 then
    raise exception 'sanitized public challenge result failed';
  end if;
end
$test$;

do $test$
begin
  begin
    perform * from public.finalize_validated_run(
      (select run_id from test_accept),
      '10000000-0000-0000-0000-000000000002',
      (select run_token from test_accept),
      '{"PG":2}'::jsonb,
      '[]'::jsonb,
      90,
      92,
      76::smallint,
      repeat('c', 64)
    );
    raise exception 'replay was accepted' using errcode = 'XX000';
  exception
    when sqlstate 'P0001' then
      null;
  end;
end
$test$;

rollback;
