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
  assert.match(api,/drilling_maintenance_review_queue_v1/);
});

test('maintenance control center prioritizes factual action classes',()=>{
  assert.match(api,/operational_review/);
  assert.match(api,/preventive_overdue/);
  assert.match(api,/operational_blocker/);
  assert.match(api,/plan_step/);
  assert.match(api,/ready_to_close/);
  assert.match(api,/closure_evidence/);
  assert.match(api,/reliability/);
  assert.match(api,/actions\.sort/);
});

test('pending drilling observations become human review actions without auto-creating work orders',()=>{
  assert.match(api,/eq\('review_status', 'pending'\)/);
  assert.match(api,/eq\('has_linked_work_order', false\)/);
  assert.match(api,/pendingOperationalReviews/);
  assert.match(api,/outOfServiceOperationalReviews/);
  assert.match(api,/Equipo fuera de servicio/);
  assert.match(api,/ordenes-trabajo\/create/);
  assert.doesNotMatch(api,/plan_due_hour_preventive_work_order_v1/);
});

test('overdue preventive creates a planning action only while no work order exists',()=>{
  assert.match(api,/row\.hour_status === 'overdue' && !row\.generated_work_order_id/);
  assert.match(api,/unplannedOverdueHourSchedules/);
  assert.match(api,/plannedOverdueHourSchedules/);
  assert.doesNotMatch(api,/preventive_planned/);
  assert.doesNotMatch(api,/Continuar OT preventiva/);
});

test('control center excludes historical work orders from operational actions',()=>{
  assert.match(api,/maintenance_work_orders/);
  assert.match(api,/not\('created_by', 'is', null\)/);
  assert.match(api,/operationalWorkOrderIds/);
  assert.match(api,/historicalOpenWorkOrders/);
});

test('maintenance home is an action center with direct operational routes',()=>{
  assert.match(page,/Qué requiere acción ahora/);
  assert.match(page,/Bandeja priorizada/);
  assert.match(page,/Revisiones operativas/);
  assert.match(page,/equipo\(s\) fuera de servicio requieren revisión humana/);
  assert.match(page,/Preventivos por planificar/);
  assert.match(page,/Bloqueos operacionales/);
  assert.match(page,/Pasos pendientes/);
  assert.match(page,/Listas para cerrar/);
  assert.match(page,/Recurrencias auditadas/);
  assert.match(page,/preventivo-horas/);
  assert.match(page,/ordenes-trabajo\/cierre/);
  assert.match(page,/horometros/);
  assert.match(page,/confiabilidad/);
});
