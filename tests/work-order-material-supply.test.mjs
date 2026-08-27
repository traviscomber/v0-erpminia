import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../supabase/migrations/20260827115500_connect_work_order_material_supply_v1.sql', import.meta.url);

test('work order material requirements connect maintenance to supply', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /create or replace function public\.upsert_work_order_material_requirement_v1/);
  assert.match(sql, /canonical_product_id = p_canonical_product_id/);
  assert.match(sql, /v_need_id := public\.refresh_work_order_supply_need\(p_work_order_id\)/);
  assert.match(sql, /public\.get_work_order_supply_status_v1/);
});

test('cancelled requirements remain cancelled during coverage refresh', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /when r\.status = 'cancelled' then 'cancelled'/);
});

test('procurement conversion uses an allowed supply need state', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /set status = 'sent_to_procurement'/);
  assert.doesNotMatch(sql, /set status = 'intake_created'/);
});

test('material supply mutations are authenticated-only', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /revoke all on function public\.upsert_work_order_material_requirement_v1\(uuid,uuid,numeric,date,text\) from public, anon/);
  assert.match(sql, /grant execute on function public\.upsert_work_order_material_requirement_v1\(uuid,uuid,numeric,date,text\) to authenticated, service_role/);
  assert.match(sql, /revoke all on function public\.cancel_work_order_material_requirement_v1\(uuid,uuid,text\) from public, anon/);
  assert.match(sql, /revoke all on function public\.convert_supply_need_to_intake_request\(uuid,uuid,text\) from public, anon/);
});
