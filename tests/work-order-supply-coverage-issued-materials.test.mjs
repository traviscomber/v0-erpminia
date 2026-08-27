import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../supabase/migrations/20260827164000_align_work_order_supply_coverage_with_issued_materials_v1.sql', import.meta.url);

test('work order supply coverage counts net issued material plus warehouse availability', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /quantity_issued,0\) - coalesce\(wp\.quantity_returned,0\)/);
  assert.match(sql, /ws\.quantity_on_hand,0\) - coalesce\(ws\.quantity_reserved,0\)/);
  assert.match(sql, /when v_shortage_count = 0 then 'covered'/);
  assert.match(sql, /when v_covered_count > 0 then 'partially_covered'/);
});

test('procurement intake is linked back to the supply need', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /procurement_request_id = v_request_id/);
  assert.match(sql, /status = 'sent_to_procurement'/);
});

test('supply RPCs remain authenticated only', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /revoke all on function public\.refresh_work_order_supply_need\(uuid\) from public, anon/);
  assert.match(sql, /revoke all on function public\.convert_supply_need_to_intake_request\(uuid,uuid,text\) from public, anon/);
});
