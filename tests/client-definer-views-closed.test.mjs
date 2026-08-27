import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../supabase/migrations/20260827144700_close_remaining_client_definer_views_v1.sql', import.meta.url);

test('remaining client-visible definer views are server-only and security invoker', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  for (const view of [
    'canonical_product_price_benchmarks_v1',
    'operational_role_inbox_coverage_v1',
    'operational_task_inbox_by_user_v2',
  ]) {
    assert.match(sql, new RegExp(`alter view public\\.${view} set \\(security_invoker = true\\)`));
    assert.match(sql, new RegExp(`revoke all on public\\.${view} from public, anon, authenticated`));
    assert.match(sql, new RegExp(`grant select on public\\.${view} to service_role`));
  }
});
