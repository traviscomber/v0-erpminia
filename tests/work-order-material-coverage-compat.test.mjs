import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../supabase/migrations/20260827122000_restore_work_order_material_coverage_compat_v1.sql', import.meta.url);

test('legacy coverage callers bridge to the current supply refresh contract', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /create or replace function public\.recalculate_work_order_material_coverage/);
  assert.match(sql, /return public\.refresh_work_order_supply_need\(p_work_order_id\)/);
});

test('coverage compatibility helper is server-only', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /revoke all on function public\.recalculate_work_order_material_coverage\(uuid,uuid\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.recalculate_work_order_material_coverage\(uuid,uuid\) to service_role/);
});
