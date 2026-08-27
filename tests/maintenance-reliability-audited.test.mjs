import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827223000_maintenance_reliability_intelligence_v1.sql', 'utf8');
const runtimeMigration = fs.readFileSync('supabase/migrations/20260827225000_maintenance_runtime_reliability_v1.sql', 'utf8');
const api = fs.readFileSync('app/api/maintenance/reliability/route.ts', 'utf8');
const page = fs.readFileSync('app/dashboard/mantenimiento/confiabilidad/page.tsx', 'utf8');

test('reliability uses only latest audited closure snapshots', () => {
  assert.match(migration, /distinct on \(s\.work_order_id\)/i);
  assert.match(migration, /work_order_closure_cost_snapshots/i);
  assert.match(migration, /maintenance_reliability_base_v1/i);
  assert.match(migration, /count\(\*\)>=2/i);
});

test('reliability views are backend only and security invoker', () => {
  assert.match(migration, /security_invoker=true/i);
  assert.match(migration, /revoke all privileges .* public, anon, authenticated/i);
  assert.match(migration, /grant select .* service_role/i);
  assert.match(runtimeMigration, /security_invoker = true/i);
  assert.match(runtimeMigration, /revoke all on public\.maintenance_runtime_reliability_by_asset_v1 from public, anon, authenticated/i);
});

test('reliability API is managerial tenant scoped and includes runtime evidence', () => {
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.MANT_GERENCIAL\)/);
  assert.match(api, /maintenance_reliability_summary_v1/);
  assert.match(api, /maintenance_reliability_by_asset_v1/);
  assert.match(api, /maintenance_runtime_reliability_by_asset_v1/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
});

test('reliability UI separates calendar interval from evidence-backed MTBF', () => {
  assert.match(page, /Intervalo:/);
  assert.match(page, /MTBF con evidencia/);
  assert.match(page, /MTBF pendiente/);
  assert.match(page, /reinicio del medidor/);
  assert.doesNotMatch(page, /MTBF observado/);
  assert.match(page, /Todavía no hay cierres auditados/);
});
