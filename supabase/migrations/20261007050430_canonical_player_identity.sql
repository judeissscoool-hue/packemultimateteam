begin;

-- Add identity-aware draft versions without changing saved versions, card IDs,
-- cycle thresholds/history, ownership checks or existing function grants.
insert into public.rulesets(version,validator_version,enabled) values
('atu-classic-v14','atu-card-cycle-identity-v1',true),
('atu-history-draft-v12','atu-card-cycle-identity-v1',true)
on conflict(version) do nothing;

do $migration$
declare
  definition text;
begin
  definition := pg_catalog.pg_get_functiondef('public.create_ranked_run(text,text)'::regprocedure);
  if pg_catalog.md5(definition) <> '6a819713ea196acfd1d48c7e03ac160c' then
    raise exception 'Inspected function changed: %', 'create_ranked_run(text,text)';
  end if;
  if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,'''atu-classic-v13'',''atu-history-draft-v11''',''))) <> 1 * pg_catalog.length('''atu-classic-v13'',''atu-history-draft-v11''') then
    raise exception 'Expected version expression missing: %', 'create_ranked_run(text,text)';
  end if;
  definition := pg_catalog.replace(definition,'''atu-classic-v13'',''atu-history-draft-v11''','''atu-classic-v13'',''atu-history-draft-v11'',''atu-classic-v14'',''atu-history-draft-v12''');
  execute definition;
end;
$migration$;

do $migration$
declare
  definition text;
begin
  definition := pg_catalog.pg_get_functiondef('public.finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text)'::regprocedure);
  if pg_catalog.md5(definition) <> '5ec57d84f1bcbf8fefaf01189fc338f2' then
    raise exception 'Inspected function changed: %', 'finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text)';
  end if;
  if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,'''atu-classic-v13'',''atu-history-draft-v11''',''))) <> 1 * pg_catalog.length('''atu-classic-v13'',''atu-history-draft-v11''') then
    raise exception 'Expected version expression missing: %', 'finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text)';
  end if;
  definition := pg_catalog.replace(definition,'''atu-classic-v13'',''atu-history-draft-v11''','''atu-classic-v13'',''atu-history-draft-v11'',''atu-classic-v14'',''atu-history-draft-v12''');
  execute definition;
end;
$migration$;

do $migration$
declare
  definition text;
begin
  definition := pg_catalog.pg_get_functiondef('public.initialize_card_cycle_rarity(uuid,uuid,text,jsonb)'::regprocedure);
  if pg_catalog.md5(definition) <> 'c607df39551b0a658772890e540ae775' then
    raise exception 'Inspected function changed: %', 'initialize_card_cycle_rarity(uuid,uuid,text,jsonb)';
  end if;
  if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,'''atu-classic-v13'',''atu-history-draft-v11''',''))) <> 1 * pg_catalog.length('''atu-classic-v13'',''atu-history-draft-v11''') then
    raise exception 'Expected version expression missing: %', 'initialize_card_cycle_rarity(uuid,uuid,text,jsonb)';
  end if;
  definition := pg_catalog.replace(definition,'''atu-classic-v13'',''atu-history-draft-v11''','''atu-classic-v13'',''atu-history-draft-v11'',''atu-classic-v14'',''atu-history-draft-v12''');
  if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,'r.rules_version=''atu-classic-v13''',''))) <> 1 * pg_catalog.length('r.rules_version=''atu-classic-v13''') then
    raise exception 'Expected version expression missing: %', 'initialize_card_cycle_rarity(uuid,uuid,text,jsonb)';
  end if;
  definition := pg_catalog.replace(definition,'r.rules_version=''atu-classic-v13''','r.rules_version in (''atu-classic-v13'',''atu-classic-v14'')');
  execute definition;
end;
$migration$;

do $migration$
declare
  definition text;
begin
  definition := pg_catalog.pg_get_functiondef('public.record_card_cycle(uuid,uuid,jsonb)'::regprocedure);
  if pg_catalog.md5(definition) <> '34f977109c895cf0bb0021638d1f523a' then
    raise exception 'Inspected function changed: %', 'record_card_cycle(uuid,uuid,jsonb)';
  end if;
  if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,'''atu-classic-v13'',''atu-history-draft-v11''',''))) <> 2 * pg_catalog.length('''atu-classic-v13'',''atu-history-draft-v11''') then
    raise exception 'Expected version expression missing: %', 'record_card_cycle(uuid,uuid,jsonb)';
  end if;
  definition := pg_catalog.replace(definition,'''atu-classic-v13'',''atu-history-draft-v11''','''atu-classic-v13'',''atu-history-draft-v11'',''atu-classic-v14'',''atu-history-draft-v12''');
  if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,'''atu-classic-v12'',''atu-classic-v13''',''))) <> 1 * pg_catalog.length('''atu-classic-v12'',''atu-classic-v13''') then
    raise exception 'Expected version expression missing: %', 'record_card_cycle(uuid,uuid,jsonb)';
  end if;
  definition := pg_catalog.replace(definition,'''atu-classic-v12'',''atu-classic-v13''','''atu-classic-v12'',''atu-classic-v13'',''atu-classic-v14''');
  execute definition;
end;
$migration$;

do $migration$
begin
  if (select count(*) from public.rulesets where version in ('atu-classic-v14','atu-history-draft-v12') and validator_version='atu-card-cycle-identity-v1' and enabled) <> 2 then
    raise exception 'Identity draft rules registration mismatch';
  end if;
end;
$migration$;

commit;
