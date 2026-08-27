import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827215000_maintenance_cost_intelligence_v1.sql', 'utf8');
const route = fs.readFileSync('app/api/maintenance/cost-intelligence/route.ts', 'utf8');
const panel = fs.readFileSync('components/maintenance/maintenance-audited-cost-intelligence.tsx', 'utf8');
const page = fs.readFileSync('app/dashboard/mantenimiento/costos/page.tsx', 'utf8');

test('maintenance cost intelligence uses only latest audited closure snapshots', () => {
  assert.match(migration, /work_order_closure_cost_snapshots/i);
  assert.match(migration, /row_number\(\)/i);
  assert.match(migration, /closure_sequence desc/i);
  assert.match(migration, /where s\.rn=1/i);
  assert.doesNotMatch(migration, /maintenance_costs\s+s/i);
});

test('maintenance cost dimensions stay factual and source separated', () => {
  assert.match(migration, /maintenance_cost_by_asset_v1/i);
  assert.match(migration, /maintenance_cost_by_cost_center_v1/i);
  assert.match(migration, /maintenance_cost_by_work_type_v1/i);
  assert.match(migration, /maintenance_cost_by_root_cause_v1/i);
  assert.match(migration, /completed_without_snapshot/i);
  assert.match(migration, /security_invoker=true/i);
});

test('audited cost API is managerial maintenance authorized and tenant scoped', () => {
  assert.match(route, /MODULE_KEYS\.MANT_GERENCIAL/);
  assert.match(route, /requireModuleAccess/);
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /maintenance_cost_intelligence_summary_v1/);
});

test('cost workspace refuses to rank legacy zero-cost closures as audited evidence', () => {
  assert.match(panel, /Aún no hay cierres auditados con snapshot/i);
  assert.match(panel, /legado no usado para ranking monetario/i);
  assert.match(panel, /no benchmarks ni scores/i);
  assert.match(page, /ledger histórico importado/i);
  assert.match(page, /MaintenanceAuditedCostIntelligence/);
  assert.match(page, /MaintenanceCostsBoard/);
});
