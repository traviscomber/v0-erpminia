import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('app/api/maintenance/work-orders/[id]/route.ts', 'utf8');

test('OT detail exposes canonical close readiness without reconstructing blockers in the client', () => {
  assert.match(api, /work_order_close_readiness_v2/);
  assert.match(api, /loadCloseReadiness/);
  assert.match(api, /closeReadiness/);
  assert.match(api, /missing_root_cause/);
  assert.match(api, /missing_preventive_actions/);
  assert.match(api, /missing_actual_hours/);
  assert.match(api, /missing_runtime_evidence/);
  assert.match(api, /standard_plan_steps_pending/);
});

test('close readiness is scoped to organization and work order', () => {
  assert.match(api, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /\.eq\('work_order_id', workOrderId\)/);
});
