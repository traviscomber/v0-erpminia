import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827231000_preventive_maintenance_hour_status_v1.sql', 'utf8');
const api = fs.readFileSync('app/api/maintenance/preventive-hours/route.ts', 'utf8');
const page = fs.readFileSync('app/dashboard/mantenimiento/preventivo-horas/page.tsx', 'utf8');
const runtimePage = fs.readFileSync('app/dashboard/mantenimiento/horometros/page.tsx', 'utf8');

test('preventive hours uses configured schedules and latest real runtime evidence', () => {
  assert.match(migration, /preventive_maintenance_schedules/);
  assert.match(migration, /asset_runtime_readings/);
  assert.match(migration, /coalesce\(lr\.meter_hours,p\.current_meter_snapshot\)/i);
  assert.match(migration, /p\.frequency_hours>0/i);
});

test('preventive hours alerts only when configured due meter is reached', () => {
  assert.match(migration, /effective_current_meter|coalesce\(lr\.meter_hours,p\.current_meter_snapshot\)/i);
  assert.match(migration, />= coalesce\(p\.next_due_meter,p\.last_executed_meter\+p\.frequency_hours\)/i);
  assert.match(migration, /meter_basis_conflict/i);
  assert.match(migration, /needs_review/i);
  assert.doesNotMatch(migration, /250|500|1000.*default/i);
});

test('preventive hour views are backend only', () => {
  assert.match(migration, /security_invoker=true/i);
  assert.match(migration, /revoke all privileges .* public,anon,authenticated/i);
  assert.match(migration, /grant select .* service_role/i);
});

test('preventive hours API is maintenance authorized, tenant scoped and reports live plan coverage', () => {
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(api, /preventive_maintenance_hour_summary_v1/);
  assert.match(api, /preventive_maintenance_hour_status_v1/);
  assert.match(api, /maintenance_standard_job_plans/);
  assert.match(api, /maintenance_standard_job_plan_applications/);
  assert.match(api, /standardPlans/);
  assert.match(api, /approvedPlansResult\.count/);
  assert.match(api, /linkedPlansResult\.count/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
});

test('preventive hours UI exposes real source, honest alert semantics and data-driven standard-plan readiness', () => {
  assert.match(page, /Preventivo por horómetro/);
  assert.match(page, /No existen umbrales genéricos/);
  assert.match(page, /Planificar intervención/);
  assert.match(page, /Revisar horómetro/);
  assert.match(page, /Procedimientos estándar disponibles/);
  assert.match(page, /standardPlans\.approved>0/);
  assert.doesNotMatch(page, /hoy no existen planes estándar aprobados/);
  assert.match(runtimePage, /preventivo-horas/);
});
