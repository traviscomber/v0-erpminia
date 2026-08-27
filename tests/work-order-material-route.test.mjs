import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routePath = new URL('../app/api/maintenance/work-orders/[id]/materials/route.ts', import.meta.url);
const scopeMigrationPath = new URL('../supabase/migrations/20260827120500_scope_work_order_material_requirement_product_v1.sql', import.meta.url);

test('material POST uses the transactional RPC instead of direct table writes', async () => {
  const source = await readFile(routePath, 'utf8');
  const post = source.slice(source.indexOf('export async function POST'), source.indexOf('export async function PUT'));
  assert.match(post, /rpc\('upsert_work_order_material_requirement_v1'/);
  assert.doesNotMatch(post, /from\('work_order_material_requirements'\)/);
});

test('material RPC scopes active canonical products to the work order organization', async () => {
  const sql = await readFile(scopeMigrationPath, 'utf8');
  assert.match(sql, /p\.organization_id = v_wo\.organization_id/);
  assert.match(sql, /p\.is_active = true/);
  assert.match(sql, /ur\.organization_id = v_wo\.organization_id/);
});
