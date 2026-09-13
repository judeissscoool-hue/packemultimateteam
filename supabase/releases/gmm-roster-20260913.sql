-- Additive rules registration. Old rules and existing results remain untouched.
begin;
insert into public.rulesets(version,validator_version,enabled) values
('atu-classic-v3','atu-gmm-v1',true),
('atu-pack-v3','atu-gmm-v1',true),
('atu-history-draft-v1','atu-gmm-v1',true),
('atu-history-pack-v1','atu-gmm-v1',true)
on conflict(version) do update set validator_version=excluded.validator_version,enabled=excluded.enabled;
commit;
