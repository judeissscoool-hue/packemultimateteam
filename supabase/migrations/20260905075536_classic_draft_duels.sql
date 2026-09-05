-- Keep existing runs on atu-v1; new duels use the shared Classic Draft replay.
insert into public.rulesets (version, validator_version, enabled)
values ('atu-classic-v2', 'atu-challenge-v3', true)
on conflict (version) do update set validator_version = excluded.validator_version, enabled = excluded.enabled;
