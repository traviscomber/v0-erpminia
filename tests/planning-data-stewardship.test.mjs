import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const api = await readFile(new URL('../app/api/planificacion/reconciliacion/route.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/dashboard/planificacion/datos/page.tsx', import.meta.url), 'utf8');
const nav = await readFile(new URL('../components/layout/operational-attention-context-nav.tsx', import.meta.url), 'utf8');

test('planner reconciliation is organization scoped and writable by authorized planner role', () => {
  assert.match(api, /requireModuleAccess/);
  assert.match(api, /MODULE_KEYS\.MANT_OPERACIONES/);
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES, true\)/);
  assert.match(api, /\.eq\('organization_id', access\.organizationId\)/);
  assert.match(api, /manual_planner_review/);
  assert.match(api, /reconciliation_reviewed_by/);
  assert.match(api, /reconciliation_reviewed_at/);
});

test('planner reconciliation preserves canonical asset ownership and evidence lineage', () => {
  assert.match(api, /maintenance_canonical_assets_v1/);
  assert.match(api, /planning_maintenance_source_rows/);
  assert.match(api, /planning_asset_meter_readings/);
  assert.match(api, /workbook_initial/);
  assert.match(api, /workbook_current/);
  assert.doesNotMatch(api, /from\('maintenance_canonical_assets_v1'\)\s*\.update\(/);
});

test('Ariel data workspace requires explicit human confirmation', () => {
  assert.match(page, /Seleccionar sólo si es inequívoco/);
  assert.match(page, /Confirmar/);
  assert.match(page, /no modifica el activo ni inventa información operacional/);
  assert.match(nav, /Data de Ariel/);
});
