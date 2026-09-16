begin;

-- A new scoring version keeps old results and active challenge digests immutable.
insert into public.rulesets(version,validator_version,enabled) values
('atu-classic-v4','atu-gmm-v2',true),
('atu-pack-v4','atu-gmm-v2',true),
('atu-history-draft-v2','atu-gmm-v2',true),
('atu-history-pack-v2','atu-gmm-v2',true)
on conflict(version) do nothing;

-- Extend only the two existing explicit Draft allowlists. Preserve their latest
-- bodies, ownership, grants, perfect-only ranking checks and security attributes.
do $migration$
declare
  signature text;
  definition text;
  old_list constant text := '(''atu-classic-v2'', ''atu-classic-v3'', ''atu-history-draft-v1'')';
  new_list constant text := '(''atu-classic-v2'', ''atu-classic-v3'', ''atu-history-draft-v1'', ''atu-classic-v4'', ''atu-history-draft-v2'')';
begin
  foreach signature in array array[
    'public.create_ranked_run(text,text)',
    'public.finalize_validated_run(uuid,uuid,text,jsonb,jsonb,numeric,numeric,smallint,text)'
  ] loop
    definition := pg_catalog.pg_get_functiondef(signature::regprocedure);
    if pg_catalog.strpos(definition, new_list) > 0 then continue; end if;
    if (pg_catalog.length(definition) - pg_catalog.length(pg_catalog.replace(definition, old_list, ''))) <> pg_catalog.length(old_list) then
      raise exception 'Expected exactly one original Draft allowlist in %; review newer function changes first', signature;
    end if;
    execute pg_catalog.replace(definition, old_list, new_list);
  end loop;
  if (select pg_catalog.count(*) from public.rulesets where version in
    ('atu-classic-v4','atu-pack-v4','atu-history-draft-v2','atu-history-pack-v2')
    and validator_version='atu-gmm-v2' and enabled) <> 4 then
    raise exception 'Scoring version registration mismatch';
  end if;
end;
$migration$;

commit;
