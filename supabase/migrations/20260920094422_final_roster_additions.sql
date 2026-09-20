begin;

insert into public.rulesets(version,validator_version,enabled) values
('atu-classic-v6','atu-roster-v2',true),
('atu-pack-v6','atu-roster-v2',true),
('atu-history-draft-v4','atu-roster-v2',true),
('atu-history-pack-v4','atu-roster-v2',true)
on conflict(version) do nothing;

-- Preserve the inspected function bodies, security mode and grants. Only extend
-- their explicit version allowlists so old drafts and account history still work.
do $migration$
declare
  signature text;
  definition text;
  old_list text;
  new_list text;
begin
  foreach signature in array array[
    'public.create_ranked_run(text,text)',
    'public.finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text)',
    'public.initialize_draft_fairness(uuid,uuid)',
    'public.record_draft_exposure(uuid,uuid,jsonb)'
  ] loop
    if signature like '%fairness%' or signature like '%exposure%' then
      old_list := '(''atu-classic-v4'',''atu-history-draft-v2'',''atu-classic-v5'',''atu-history-draft-v3'')';
      new_list := '(''atu-classic-v4'',''atu-history-draft-v2'',''atu-classic-v5'',''atu-history-draft-v3'',''atu-classic-v6'',''atu-history-draft-v4'')';
    else
      old_list := '(''atu-classic-v2'', ''atu-classic-v3'', ''atu-history-draft-v1'', ''atu-classic-v4'', ''atu-history-draft-v2'', ''atu-classic-v5'', ''atu-history-draft-v3'')';
      new_list := '(''atu-classic-v2'', ''atu-classic-v3'', ''atu-history-draft-v1'', ''atu-classic-v4'', ''atu-history-draft-v2'', ''atu-classic-v5'', ''atu-history-draft-v3'',''atu-classic-v6'',''atu-history-draft-v4'')';
    end if;
    definition := pg_catalog.pg_get_functiondef(signature::regprocedure);
    if pg_catalog.strpos(definition,new_list)>0 then continue; end if;
    if (pg_catalog.length(definition)-pg_catalog.length(pg_catalog.replace(definition,old_list,'')))<>pg_catalog.length(old_list) then
      raise exception 'Expected exactly one inspected version allowlist in %',signature;
    end if;
    execute pg_catalog.replace(definition,old_list,new_list);
  end loop;
  if (select count(*) from public.rulesets where version in ('atu-classic-v6','atu-pack-v6','atu-history-draft-v4','atu-history-pack-v4') and validator_version='atu-roster-v2' and enabled)<>4 then
    raise exception 'Roster rules registration mismatch';
  end if;
end;
$migration$;
commit;
