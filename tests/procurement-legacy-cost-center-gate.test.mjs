import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../supabase/migrations/20260829222559_harden_legacy_procurement_cost_center_gate.sql', import.meta.url);

test('legacy procurement purchase orders require a valid active cost center', async () => {
  const source = await readFile(migrationPath, 'utf8');

  assert.match(source, /new\.source_sheet = 'procurement_workflow'/);
  assert.match(source, /nullif\(btrim\(new\.cost_center_code\), ''\) is null/);
  assert.match(source, /c\.organization_id = new\.organization_id/);
  assert.match(source, /c\.code = new\.cost_center_code/);
  assert.match(source, /coalesce\(c\.status, 'active'\) not in \('inactive', 'disabled', 'closed'\)/);
  assert.match(source, /Imputación contable pendiente/);
  assert.match(source, /Imputación contable inválida/);
});

test('award decision trigger function is not directly executable by client roles', async () => {
  const source = await readFile(migrationPath, 'utf8');

  assert.match(source, /revoke execute on function public\.enforce_procurement_award_decision_context_v1\(\) from public, anon, authenticated;/i);
  assert.match(source, /grant execute on function public\.enforce_procurement_award_decision_context_v1\(\) to service_role;/i);
});
