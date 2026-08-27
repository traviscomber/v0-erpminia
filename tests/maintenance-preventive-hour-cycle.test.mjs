import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827232000_preventive_hour_work_order_cycle_v1.sql', 'utf8');
const api = fs.readFileSync('app/api/maintenance/preventive-hours/route.ts', 'utf8');
const page = fs.readFileSync('app/dashboard/mantenimiento/preventivo-horas/page.tsx', 'utf8');

test('overdue hour schedule plans exactly one work order through tenant safe wrapper', () => {
  assert.match(migration, /plan_due_hour_preventive_work_order_v1/);
  assert.match(migration, /v_status\s*<>\s*'overdue'/);
  assert.match(migration, /create_work_order_from_schedule/);
  assert.match(migration, /user_roles/);
  assert.match(migration, /grant execute .*service_role/i);
});

test('hour based preventive close requires a real meter reading', () => {
  assert.match(migration, /preventiva por horas requiere una lectura real de horómetro/i);
  assert.match(migration, /evidence_status <> 'meter_reading'/);
  assert.match(migration, /runtime_reading_id is null/);
});

test('successful close advances due meter from closing reading plus configured frequency', () => {
  assert.match(migration, /last_executed_meter=v_meter/);
  assert.match(migration, /next_due_meter=v_meter\+frequency_hours/);
  assert.match(migration, /generated_work_order_id=null/);
  assert.match(migration, /preventive_hour_cycle_advanced/);
});

test('close readiness requests meter evidence for hour scheduled OT', () => {
  assert.match(migration, /hour_schedule_linked/);
  assert.match(migration, /record_runtime_evidence/);
  assert.match(migration, /security_invoker=true/i);
});

test('preventive hours endpoint plans only within tenant and UI exposes generated OT', () => {
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES, true\)/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /plan_due_hour_preventive_work_order_v1/);
  assert.match(page, /Planificar intervención/);
  assert.match(page, /OT generada/);
  assert.match(page, /Crear la OT no mueve la pauta/);
});
