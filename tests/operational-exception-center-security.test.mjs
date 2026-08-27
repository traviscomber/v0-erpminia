import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../supabase/migrations/20260827102500_lock_down_operational_exception_center_views.sql', import.meta.url);

test('operational exception center is server-only and security invoker', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /operational_exception_center_v1 set \(security_invoker = true\)/);
  assert.match(sql, /operational_exception_center_summary_v1 set \(security_invoker = true\)/);
  assert.match(sql, /operational_exception_center_v1 from anon, authenticated/);
  assert.match(sql, /operational_exception_center_summary_v1 from anon, authenticated/);
  assert.match(sql, /to service_role/);
});
