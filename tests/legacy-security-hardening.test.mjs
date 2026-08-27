import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const legacyTasks = new URL('../supabase/migrations/20260827144500_harden_legacy_operational_task_chain_v1.sql', import.meta.url);
const drillQueues = new URL('../supabase/migrations/20260827144600_harden_drill_location_review_queue_v1.sql', import.meta.url);

test('legacy operational task chain is server-only and security invoker', async () => {
  const sql = await readFile(legacyTasks, 'utf8');
  for (const view of [
    'operational_attention_global_v1',
    'operational_attention_global_summary_v1',
    'operational_tasks_by_cargo_v1',
    'operational_tasks_by_cargo_v2',
    'operational_tasks_by_cargo_v3',
    'operational_tasks_by_cargo_v4',
    'operational_tasks_by_cargo_v5',
  ]) {
    assert.match(sql, new RegExp(`alter view public\\.${view} set \\(security_invoker = true\\)`));
  }
  assert.match(sql, /revoke all on public\.operational_attention_global_v1 from public, anon, authenticated/);
  assert.match(sql, /grant select on public\.operational_attention_global_v1 to service_role/);
});

test('drill location review queues are server-only and security invoker', async () => {
  const sql = await readFile(drillQueues, 'utf8');
  for (const version of ['v3', 'v4', 'v5']) {
    assert.match(sql, new RegExp(`alter view public\\.production_drill_hole_location_review_queue_${version} set \\(security_invoker = true\\)`));
    assert.match(sql, new RegExp(`revoke all on public\\.production_drill_hole_location_review_queue_${version} from public, anon, authenticated`));
    assert.match(sql, new RegExp(`grant select on public\\.production_drill_hole_location_review_queue_${version} to service_role`));
  }
});
