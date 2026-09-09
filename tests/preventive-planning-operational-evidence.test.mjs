import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const api = fs.readFileSync('app/api/maintenance/preventive/route.ts', 'utf8');
const ui = fs.readFileSync('components/maintenance/preventive-plan-board.tsx', 'utf8');

test('preventive planning loads operational candidates and hour evidence with tenant scope', () => {
  assert.match(api, /maintenance_operation_task_candidates_v1/);
  assert.match(api, /preventive_maintenance_hour_status_v1/);
  assert.match(api, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /meter_basis_warning/);
  assert.match(api, /needs_reconciliation/);
});

test('derived observations remain pending human review and do not create work automatically', () => {
  assert.match(api, /pending_human_review/);
  assert.match(ui, /No son diagnóstico ni OT hasta validación humana/);
  assert.match(ui, /Revisar como plan/);
  assert.doesNotMatch(ui, /Crear OT desde señal/);
});

test('planning warns when source meter is below last executed meter', () => {
  assert.match(api, /effective < lastExecuted/);
  assert.match(ui, /Reconciliar contador/);
  assert.match(ui, /reset, cambio de contador o error de planilla/);
});

test('existing open work orders are surfaced before promoting a candidate', () => {
  assert.match(api, /open_work_orders/);
  assert.match(ui, /OT abierta\(s\).*Revisar antes de crear trabajo adicional/);
});
