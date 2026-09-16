// Read a private export of existing verified perfect drafts; emit only digest-keyed SQL.
// Export columns: run_id, rules_version, result_digest, transcript, roster, draft_seed.
// This script never connects to or writes to a database.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {getEngineForRules,isClassicRulesVersion} from '../supabase/functions/_shared/atu-engine-v1.js';
const rows=JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const values=rows.map(row=>{
  assert(isClassicRulesVersion(row.rules_version),'Only Classic Draft history may be converted');
  assert(/^[a-f0-9]{64}$/.test(row.result_digest),'Invalid result digest');
  const engine=getEngineForRules(row.rules_version);
  const replay=engine.validateTranscript(row.draft_seed,row.transcript,'draft',row.rules_version);
  assert.deepEqual(replay.roster,row.roster,'Replay must match the saved roster');
  assert.equal(replay.result.projectedWins,82,'Historical entry must replay to 82 wins');
  const points=1000+Number(replay.result.effectiveRating.toFixed(2));
  assert(points>=1060&&points<=1120,'Unexpected rating range');
  return `('${row.result_digest}', ${points.toFixed(2)}::numeric)`;
});
console.log('-- Replayed historical perfect drafts; keyed by existing result digest, no user IDs.');
if(values.length)console.log(`update public.leaderboard_entries l set points = verified.points
from (values\n${values.join(',\n')}\n) verified(digest,points)
where l.result_digest = verified.digest and l.mode = 'draft' and l.wins = 82 and l.losses = 0
  and l.points not between 1060 and 1120;`);
console.log(`-- Stop rather than silently omit any perfect results added since this export.
do $$ begin
  if exists(select 1 from public.leaderboard_entries where mode='draft' and wins=82 and losses=0 and points not between 1060 and 1120) then
    raise exception 'Refresh the verified perfect-draft backfill before applying this migration';
  end if;
end $$;`);
