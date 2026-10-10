begin;

-- Change only Classic result rules; retain every previous replay version,
-- all rarity/card-cycle policy and the current season cutoff.
insert into public.rulesets(version,validator_version,enabled) values
('atu-classic-v15','atu-classic-difficulty-v1',true),
('atu-history-draft-v13','atu-classic-difficulty-v1',true)
on conflict(version) do nothing;

do $migration$
declare
  definition text;
begin
  definition := pg_catalog.pg_get_functiondef('public.create_ranked_run(text,text)'::regprocedure);
  if pg_catalog.md5(definition) <> '2946d789ebe06628d36bc53bb6544b91' then
    raise exception 'Inspected function changed: %', 'public.create_ranked_run(text,text)';
  end if;
  if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,'''atu-classic-v14'',''atu-history-draft-v12''',''))) <> 1 * pg_catalog.length('''atu-classic-v14'',''atu-history-draft-v12''') then
    raise exception 'Expected version expression missing: %', 'public.create_ranked_run(text,text)';
  end if;
  definition := pg_catalog.replace(definition,'''atu-classic-v14'',''atu-history-draft-v12''','''atu-classic-v14'',''atu-history-draft-v12'',''atu-classic-v15'',''atu-history-draft-v13''');
  execute definition;
end;
$migration$;

do $migration$
declare
  definition text;
begin
  definition := pg_catalog.pg_get_functiondef('public.finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text)'::regprocedure);
  if pg_catalog.md5(definition) <> 'efa47617558cac2974e86d7c1f0cf1e2' then
    raise exception 'Inspected function changed: %', 'public.finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text)';
  end if;
  if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,'''atu-classic-v14'',''atu-history-draft-v12''',''))) <> 1 * pg_catalog.length('''atu-classic-v14'',''atu-history-draft-v12''') then
    raise exception 'Expected version expression missing: %', 'public.finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text)';
  end if;
  definition := pg_catalog.replace(definition,'''atu-classic-v14'',''atu-history-draft-v12''','''atu-classic-v14'',''atu-history-draft-v12'',''atu-classic-v15'',''atu-history-draft-v13''');
  execute definition;
end;
$migration$;

do $migration$
declare
  definition text;
begin
  definition := pg_catalog.pg_get_functiondef('public.initialize_card_cycle_rarity(uuid,uuid,text,jsonb)'::regprocedure);
  if pg_catalog.md5(definition) <> 'a83811f3dab5b8ec3472e7a73ec00fd9' then
    raise exception 'Inspected function changed: %', 'public.initialize_card_cycle_rarity(uuid,uuid,text,jsonb)';
  end if;
  if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,'''atu-classic-v14'',''atu-history-draft-v12''',''))) <> 1 * pg_catalog.length('''atu-classic-v14'',''atu-history-draft-v12''') then
    raise exception 'Expected version expression missing: %', 'public.initialize_card_cycle_rarity(uuid,uuid,text,jsonb)';
  end if;
  definition := pg_catalog.replace(definition,'''atu-classic-v14'',''atu-history-draft-v12''','''atu-classic-v14'',''atu-history-draft-v12'',''atu-classic-v15'',''atu-history-draft-v13''');
  if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,'''atu-classic-v13'',''atu-classic-v14''',''))) <> 1 * pg_catalog.length('''atu-classic-v13'',''atu-classic-v14''') then
    raise exception 'Expected version expression missing: %', 'public.initialize_card_cycle_rarity(uuid,uuid,text,jsonb)';
  end if;
  definition := pg_catalog.replace(definition,'''atu-classic-v13'',''atu-classic-v14''','''atu-classic-v13'',''atu-classic-v14'',''atu-classic-v15''');
  execute definition;
end;
$migration$;

do $migration$
declare
  definition text;
begin
  definition := pg_catalog.pg_get_functiondef('public.record_card_cycle(uuid,uuid,jsonb)'::regprocedure);
  if pg_catalog.md5(definition) <> '9102ad52116e53179cc8aebd3e5287a5' then
    raise exception 'Inspected function changed: %', 'public.record_card_cycle(uuid,uuid,jsonb)';
  end if;
  if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,'''atu-classic-v14'',''atu-history-draft-v12''',''))) <> 2 * pg_catalog.length('''atu-classic-v14'',''atu-history-draft-v12''') then
    raise exception 'Expected version expression missing: %', 'public.record_card_cycle(uuid,uuid,jsonb)';
  end if;
  definition := pg_catalog.replace(definition,'''atu-classic-v14'',''atu-history-draft-v12''','''atu-classic-v14'',''atu-history-draft-v12'',''atu-classic-v15'',''atu-history-draft-v13''');
  if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,'''atu-classic-v12'',''atu-classic-v13'',''atu-classic-v14''',''))) <> 1 * pg_catalog.length('''atu-classic-v12'',''atu-classic-v13'',''atu-classic-v14''') then
    raise exception 'Expected version expression missing: %', 'public.record_card_cycle(uuid,uuid,jsonb)';
  end if;
  definition := pg_catalog.replace(definition,'''atu-classic-v12'',''atu-classic-v13'',''atu-classic-v14''','''atu-classic-v12'',''atu-classic-v13'',''atu-classic-v14'',''atu-classic-v15''');
  execute definition;
end;
$migration$;

do $migration$
begin
  if (select count(*) from public.rulesets where version in ('atu-classic-v15','atu-history-draft-v13') and validator_version='atu-classic-difficulty-v1' and enabled) <> 2 then
    raise exception 'Classic difficulty rules registration mismatch';
  end if;
end;
$migration$;

commit;
