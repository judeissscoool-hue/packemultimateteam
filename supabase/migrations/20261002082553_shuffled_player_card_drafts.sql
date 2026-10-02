begin;

insert into public.rulesets(version,validator_version,enabled) values
('atu-classic-v11','atu-shuffled-player-v1',true),
('atu-history-draft-v9','atu-shuffled-player-v1',true)
on conflict(version) do nothing;

-- Extend only the inspected Classic version allowlists. Preserve existing
-- function bodies, ownership, security modes, grants and prior draft rules.
do $migration$
declare
  signature text;
  definition text;
  old_list text := '(''atu-classic-v2'', ''atu-classic-v3'', ''atu-history-draft-v1'', ''atu-classic-v4'', ''atu-history-draft-v2'', ''atu-classic-v5'', ''atu-history-draft-v3'',''atu-classic-v6'',''atu-history-draft-v4'',''atu-classic-v7'',''atu-history-draft-v5'',''atu-classic-v8'',''atu-history-draft-v6'',''atu-classic-v9'',''atu-history-draft-v7'',''atu-classic-v10'',''atu-history-draft-v8'')';
  new_list text;
begin
  new_list := pg_catalog.left(old_list,-1) || ',''atu-classic-v11'',''atu-history-draft-v9'')';
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
  if (select count(*) from public.rulesets where version in ('atu-classic-v11','atu-history-draft-v9') and validator_version='atu-shuffled-player-v1' and enabled)<>2 then
    raise exception 'Shuffled player rules registration mismatch';
  end if;
end;
$migration$;
commit;
