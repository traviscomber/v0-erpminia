import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20260829022000_fix_work_order_labor_timestamps_v1.sql', import.meta.url), 'utf8');
const route = await readFile(new URL('../app/api/maintenance/work-orders/[id]/route.ts', import.meta.url), 'utf8');

test('labor registration persists required timestamps atomically inside the database function', () => {
  assert.match(migration, /v_recorded_at\s+timestamptz\s*:=\s*now\(\)/i);
  assert.match(migration, /started_at\s*,\s*ended_at\s*,\s*hours\s*,\s*hourly_cost/i);
  assert.match(migration, /v_recorded_at\s*,\s*v_recorded_at\s*,\s*p_hours\s*,\s*p_hourly_cost/i);
});

test('work order detail resolves canonical asset metadata from the canonical asset view', () => {
  assert.match(route, /from\('maintenance_canonical_assets_v1'\)/);
  assert.match(route, /select\('id, asset_code, name, asset_type, category, manufacturer, model, serial_number, license_plate'\)/);
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /eq\('id', assetId\)/);
  assert.doesNotMatch(route, /from\('maintenance_assets'\)\.select\('id, asset_code, asset_name/);
});
