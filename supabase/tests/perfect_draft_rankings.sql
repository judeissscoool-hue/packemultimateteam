-- Run on a disposable database after all migrations. Never on production.
begin;
insert into auth.users(id,email) values
('10000000-0000-4000-8000-000000000001','ranking-test-a@example.test'),
('10000000-0000-4000-8000-000000000002','ranking-test-b@example.test');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$
declare
  attempt record;
  second_attempt record;
  count_runs integer;
  rejected boolean;
  roster jsonb := '{"PG":1,"SG":2,"SF":3,"PF":4,"C":5,"B1":6,"B2":7,"B3":8}';
  actions jsonb := '[{"type":"captain","cardId":1},{"type":"arrange","roster":{"PG":1,"SG":2,"SF":3,"PF":4,"C":5,"B1":6,"B2":7,"B3":8}}]';
  revised jsonb;
  placement record;
begin
  assert not has_function_privilege('anon','public.finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text)','execute');
  assert not has_function_privilege('authenticated','public.finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text)','execute');
  assert has_function_privilege('service_role','public.finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text)','execute');
  for i in 1..75 loop
    select * into attempt from public.create_ranked_run('draft','atu-classic-v2');
  end loop;
  select count(*) into count_runs from public.game_runs where user_id=auth.uid();
  assert count_runs=75, 'Draft attempts have no daily cap';
  rejected:=false;
  begin perform * from public.create_ranked_run('pack','atu-pack-v2'); exception when sqlstate '22023' then rejected:=true; end;
  assert rejected, 'Pack cannot start ranked runs';
  rejected:=false;
  begin perform * from public.create_ranked_run('draft','atu-pack-v2'); exception when sqlstate '22023' then rejected:=true; end;
  assert rejected, 'Pack rules cannot masquerade as a draft';
  rejected:=false;
  begin perform * from public.get_leaderboard('pack'); exception when sqlstate '22023' then rejected:=true; end;
  assert rejected, 'Pack rankings are unavailable';
  rejected:=false;
  begin perform * from public.finalize_validated_run(attempt.run_id,auth.uid(),attempt.run_token,roster,actions,1102,99,81::smallint,repeat('a',64)); exception when sqlstate '22023' then rejected:=true; end;
  assert rejected and not exists(select 1 from public.leaderboard_entries), '81 wins never reaches rankings';
  perform * from public.finalize_validated_run(attempt.run_id,auth.uid(),attempt.run_token,roster,actions,1102,99,82::smallint,repeat('a',64));
  perform * from public.finalize_validated_run(attempt.run_id,auth.uid(),attempt.run_token,roster,actions,1102,99,82::smallint,repeat('a',64));
  assert (select count(*)=1 from public.leaderboard_entries), 'Retry must not duplicate a draft';
  revised := (actions - 1) || '[{"type":"swap","from":"B1","to":"B2"}]'::jsonb || jsonb_build_array(actions->1);
  perform * from public.finalize_validated_run(attempt.run_id,auth.uid(),attempt.run_token,roster,revised,1103,99,82::smallint,repeat('b',64));
  assert (select count(*)=1 and max(points)=1103 from public.leaderboard_entries), 'Higher OVR updates the same entry';
  rejected:=false;
  begin perform * from public.finalize_validated_run(attempt.run_id,auth.uid(),attempt.run_token,roster,revised,1102,99,82::smallint,repeat('c',64)); exception when sqlstate '22023' then rejected:=true; end;
  assert rejected and (select max(points)=1103 from public.leaderboard_entries), 'Saved best cannot decrease';
  rejected:=false;
  begin perform * from public.finalize_validated_run(attempt.run_id,auth.uid(),repeat('f',64),roster,revised,1104,99,82::smallint,repeat('d',64)); exception when sqlstate '22023' then rejected:=true; end;
  assert rejected, 'Updates require the correct token';
  rejected:=false;
  begin perform * from public.finalize_validated_run(attempt.run_id,auth.uid(),attempt.run_token,roster,jsonb_set(revised,'{0,cardId}','99'),1104,99,82::smallint,repeat('d',64)); exception when sqlstate '22023' then rejected:=true; end;
  assert rejected, 'Saved card selections cannot be changed';
  select * into second_attempt from public.create_ranked_run('draft','atu-classic-v2');
  perform * from public.finalize_validated_run(second_attempt.run_id,auth.uid(),second_attempt.run_token,roster,actions,1100,99,82::smallint,repeat('e',64));
  select * into placement from public.get_leaderboard('draft');
  assert placement.games=2 and placement.points=2103 and placement.best_team_ovr=103, 'Count-first score adds best chemistry-adjusted OVR once';
  -- A different account with a stronger single draft must remain below two drafts.
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  select * into second_attempt from public.create_ranked_run('draft','atu-classic-v2');
  perform * from public.finalize_validated_run(second_attempt.run_id,auth.uid(),second_attempt.run_token,roster,actions,1109,99,82::smallint,repeat('f',64));
  select * into placement from public.get_leaderboard('draft') where points=1109;
  assert placement.rank=2, 'A stronger OVR never overtakes an extra perfect draft';
  assert (public.get_beta_season_status()->>'eligible_players')::int=2, 'Season population counts eligible accounts';
  assert (public.get_beta_season_status()->'viewer'->>'rank')::int=2, 'Season summary returns the authenticated caller';
  -- Historical pack/non-perfect records remain stored, but cannot qualify.
  update public.game_runs set mode='pack' where id=second_attempt.run_id;
  update public.leaderboard_entries set mode='pack' where run_id=second_attempt.run_id;
  rejected:=false;
  begin perform * from public.finalize_validated_run(second_attempt.run_id,auth.uid(),second_attempt.run_token,roster,actions,1109,99,82::smallint,repeat('f',64)); exception when sqlstate '22023' then rejected:=true; end;
  assert rejected, 'Existing Pack runs cannot bypass the server exclusion';
  assert (select count(*)=1 from public.get_leaderboard('draft')), 'Pack entries never leak into the draft board';
  assert (public.get_beta_season_status()->>'eligible_players')::int=1, 'Pack cannot enter the season population';
  assert public.get_beta_season_status()->'viewer'='null'::jsonb, 'Ineligible account has no season standing';
  perform set_config('request.jwt.claim.sub','',true);
  assert public.get_beta_season_status()->'viewer'='null'::jsonb, 'Anonymous access cannot reveal another account''s progress';
end $$;
rollback;
