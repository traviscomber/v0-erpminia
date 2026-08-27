import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const actorMigration = new URL('../supabase/migrations/20260827163000_fix_stock_movement_actor_identity_v1.sql', import.meta.url);
const costMigration = new URL('../supabase/migrations/20260827165500_fix_work_order_parts_generated_total_cost_v1.sql', import.meta.url);
const assetMigration = new URL('../supabase/migrations/20260827170000_allow_work_order_parts_without_canonical_asset_v1.sql', import.meta.url);

test('stock movements use the auth identity required by the foreign key', async () => {
  const sql = await readFile(actorMigration, 'utf8');
  assert.match(sql, /auth\.uid\(\),'Recepción de OC operativa'/);
  assert.match(sql, /auth\.uid\(\),'Entrega a OT'/);
});

test('work order part issue does not write the generated total cost column', async () => {
  const sql = await readFile(costMigration, 'utf8');
  assert.match(sql, /quantity_requested,quantity_issued,unit_cost,status,created_by/);
  assert.doesNotMatch(sql, /quantity_requested,quantity_issued,unit_cost,total_cost,status,created_by\$q\$/);
});

test('work order parts can remain linked to an OT before canonical asset mapping', async () => {
  const sql = await readFile(assetMigration, 'utf8');
  assert.match(sql, /alter column canonical_asset_id drop not null/);
});
