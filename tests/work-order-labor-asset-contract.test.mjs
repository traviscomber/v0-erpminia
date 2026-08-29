import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const laborMigration = await readFile(new URL('../supabase/migrations/20260829021858_fix_work_order_labor_generated_hours_v2.sql', import.meta.url), 'utf8');
const route = await readFile(new URL('../app/api/maintenance/work-orders/[id]/route.ts', import.meta.url), 'utf8');

test('labor registration derives generated hours from started and ended timestamps', () => {
  assert.match(laborMigration, /v_started_at\s+timestamptz\s*:=\s*now\(\)/i);
  assert.match(laborMigration, /v_ended_at\s*:=\s*v_started_at\s*\+\s*make_interval/i);
  assert.match(laborMigration, /started_at\s*,\s*ended_at\s*,\s*hourly_cost/i);
  assert.doesNotMatch(laborMigration, /started_at\s*,\s*ended_at\s*,\s*hours\s*,\s*hourly_cost/i);
  assert.match(laborMigration, /v_started_at\s*,\s*v_ended_at\s*,\s*p_hourly_cost/i);
});

test('work order detail resolves canonical asset metadata from the canonical asset view', () => {
  assert.match(route, /from\('maintenance_canonical_assets_v1'\)/);
  assert.match(route, /select\('id, asset_code, name, asset_type, category, manufacturer, model, serial_number, license_plate'\)/);
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /eq\('id', assetId\)/);
  assert.doesNotMatch(route, /from\('maintenance_assets'\)\.select\('id, asset_code, asset_name/);
});
