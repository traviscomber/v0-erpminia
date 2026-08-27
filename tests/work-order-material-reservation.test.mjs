import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const reservationMigration = fs.readFileSync('supabase/migrations/20260827192500_reserve_work_order_inventory_v1.sql','utf8');
const bridgeMigration = fs.readFileSync('supabase/migrations/20260827193000_bridge_legacy_material_issue_to_reservation_v1.sql','utf8');
const route = fs.readFileSync('app/api/maintenance/work-orders/[id]/materials/route.ts','utf8');

test('work order coverage reserves warehouse stock instead of sharing free stock across OTs',()=>{
  assert.match(reservationMigration,/reserve_available_materials_to_work_order_v1/);
  assert.match(reservationMigration,/set quantity_reserved = coalesce\(quantity_reserved,0\) \+ v_take/);
  assert.match(reservationMigration,/status = 'reserved'/);
  assert.match(reservationMigration,/coverage_basis','reserved_or_issued/);
  assert.doesNotMatch(reservationMigration,/set quantity_available\s*=\s*coalesce\(\(\s*select sum\(greatest\(coalesce\(ws\.quantity_available/);
});

test('reservation allocation locks stock and never exceeds actual free capacity',()=>{
  assert.match(reservationMigration,/for update/);
  assert.match(reservationMigration,/greatest\(coalesce\(v_stock\.quantity_on_hand,0\) - coalesce\(v_stock\.quantity_reserved,0\),0\)/);
  assert.match(reservationMigration,/coalesce\(ws\.quantity_available,0\) > 0/);
});

test('material issue consumes only explicit reservations',()=>{
  assert.match(reservationMigration,/issue_available_materials_to_work_order_v2/);
  assert.match(reservationMigration,/wp\.status='reserved'/);
  assert.match(reservationMigration,/quantity_on_hand=quantity_on_hand-v_qty/);
  assert.match(reservationMigration,/quantity_reserved=greatest\(quantity_reserved-v_qty,0\)/);
  assert.match(reservationMigration,/source','explicit_reservation/);
});

test('legacy issue callers are bridged to the reservation-aware function',()=>{
  assert.match(bridgeMigration,/return public\.issue_available_materials_to_work_order_v2\(v_org,p_work_order_id\)/);
  assert.match(bridgeMigration,/revoke all on function public\.issue_available_materials_to_work_order\(uuid\) from public,anon/);
});

test('bulk material replacement is transactional and releases stale reservations',()=>{
  assert.match(reservationMigration,/replace_work_order_material_requirements_v1/);
  assert.match(reservationMigration,/release_work_order_material_reservations_v1\(p_organization_id,p_work_order_id,null\)/);
  assert.match(reservationMigration,/delete from public\.work_order_material_requirements/);
  assert.match(route,/replace_work_order_material_requirements_v1/);
  assert.doesNotMatch(route,/\.from\('work_order_material_requirements'\)\s*\.delete\(/);
});

test('reservation mutations remain tenant scoped',()=>{
  assert.match(reservationMigration,/organization_id = p_organization_id/);
  assert.match(reservationMigration,/public\.current_application_user_id\(\)/);
  assert.match(route,/p_organization_id: context\.organizationId/);
});
