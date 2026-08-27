import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../supabase/migrations/20260827225000_maintenance_runtime_reliability_v1.sql', import.meta.url);
const routePath = new URL('../app/api/maintenance/reliability/route.ts', import.meta.url);
const pagePath = new URL('../app/dashboard/mantenimiento/confiabilidad/page.tsx', import.meta.url);

const [migration, route, page] = await Promise.all([
  readFile(migrationPath, 'utf8'),
  readFile(routePath, 'utf8'),
  readFile(pagePath, 'utf8'),
]);

test('MTBF requires consecutive audited corrective events with valid meter evidence', () => {
  assert.match(migration, /maintenance_corrective_runtime_events_v1/);
  assert.match(migration, /operating_hours_between_correctives/);
  assert.match(migration, /meter_reset_between_correctives/);
  assert.match(migration, /meter_hours_at_or_before_close <= s\.previous_corrective_meter_hours/);
  assert.match(migration, /lower\(trim\(coalesce\(w\.work_type,''\)\)\) in \('correctivo','corrective','emergency','emergencia','failure','falla'\)/);
});

test('runtime reliability views remain backend only and security invoker', () => {
  assert.match(migration, /with \(security_invoker = true\)/);
  assert.match(migration, /revoke all on public\.maintenance_corrective_runtime_events_v1 from public, anon, authenticated/);
  assert.match(migration, /revoke all on public\.maintenance_runtime_reliability_by_asset_v1 from public, anon, authenticated/);
  assert.match(migration, /grant select on public\.maintenance_runtime_reliability_by_asset_v1 to service_role/);
});

test('reliability API exposes runtime evidence without replacing audited closure evidence', () => {
  assert.match(route, /maintenance_reliability_by_asset_v1/);
  assert.match(route, /maintenance_runtime_reliability_by_asset_v1/);
  assert.match(route, /assets_with_valid_mtbf/);
  assert.match(route, /valid_mtbf_intervals/);
  assert.match(route, /audited_work_order_closures\+asset_runtime_readings/);
});

test('reliability UI labels MTBF and MTTR only as evidence-backed metrics', () => {
  assert.match(page, /MTBF con evidencia/);
  assert.match(page, /MTBF pendiente/);
  assert.match(page, /Cobertura horómetro/);
  assert.match(page, /Si falta una lectura o se detecta reinicio del medidor, ese intervalo se excluye/);
  assert.match(page, /MTTR usa las horas reales de ejecución registradas en la OT/);
});
