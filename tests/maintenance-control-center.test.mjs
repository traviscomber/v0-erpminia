import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('app/api/maintenance/control-center/route.ts','utf8');
const page = fs.readFileSync('app/dashboard/mantenimiento/page.tsx','utf8');

test('maintenance control center is maintenance-authorized and tenant scoped',()=>{
  assert.match(api,/MODULE_KEYS\.MANT_OPERACIONES/);
  assert.match(api,/eq\('organization_id', context\.organizationId\)/);
  assert.match(api,/work_order_close_readiness_v2/);
  assert.match(api,/preventive_maintenance_hour_status_v1/);
  assert.match(api,/maintenance_reliability_by_asset_v1/);
});

test('maintenance control center prioritizes factual action classes',()=>{
  assert.match(api,/preventive_overdue/);
  assert.match(api,/preventive_planned/);
  assert.match(api,/operational_blocker/);
  assert.match(api,/plan_step/);
  assert.match(api,/ready_to_close/);
  assert.match(api,/closure_evidence/);
  assert.match(api,/reliability/);
  assert.match(api,/actions\.sort/);
});

test('planned overdue preventive work links to its existing work order instead of re-planning',()=>{
  assert.match(api,/generated_work_order_id/);
  assert.match(api,/Continuar OT preventiva/);
  assert.match(api,/preventive-planned:/);
  assert.match(api,/ordenes-trabajo\/\$\{encodeURIComponent\(generatedWorkOrderId\)\}/);
  assert.match(api,/unplannedOverdueHourSchedules/);
  assert.match(api,/plannedOverdueHourSchedules/);
});

test('maintenance home is an action center with direct operational routes',()=>{
  assert.match(page,/Qué requiere acción ahora/);
  assert.match(page,/Bandeja priorizada/);
  assert.match(page,/Preventivos vencidos/);
  assert.match(page,/Bloqueos operacionales/);
  assert.match(page,/Pasos pendientes/);
  assert.match(page,/Listas para cerrar/);
  assert.match(page,/Recurrencias auditadas/);
  assert.match(page,/preventivo-horas/);
  assert.match(page,/ordenes-trabajo\/cierre/);
  assert.match(page,/horometros/);
  assert.match(page,/confiabilidad/);
});
