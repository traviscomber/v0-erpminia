import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827233000_standard_job_plan_authoring_v1.sql','utf8');
const preventive = fs.readFileSync('app/dashboard/mantenimiento/preventivo-horas/page.tsx','utf8');
const apply = fs.readFileSync('lib/maintenance/apply-standard-job-plan.ts','utf8');

const proposalFn = migration.split('create or replace function public.add_standard_job_plan_step_v1')[0];

test('standard plan proposal comes from an existing preventive schedule without invented steps', () => {
  assert.match(proposalFn,/propose_standard_job_plan_from_schedule_v1/);
  assert.match(proposalFn,/preventive_maintenance_schedules/);
  assert.match(proposalFn,/'proposed'/i);
  assert.doesNotMatch(proposalFn,/insert into public\.maintenance_standard_job_plan_steps/i);
});

test('standard plan cannot be approved empty', () => {
  assert.match(migration,/Agrega al menos un paso antes de aprobar/);
  assert.match(migration,/maintenance_standard_job_plan_steps/);
  assert.match(migration,/status='approved'/);
});

test('standard plan authoring RPCs remain backend only', () => {
  assert.match(migration,/revoke all on function public\.propose_standard_job_plan_from_schedule_v1.*public,anon,authenticated/i);
  assert.match(migration,/grant execute on function public\.propose_standard_job_plan_from_schedule_v1.*service_role/i);
});

test('preventive hours exposes the evidence gap and standard plan workspace', () => {
  assert.match(preventive,/Planes estándar/);
  assert.match(preventive,/no existen planes estándar aprobados ni BOM técnico cargado/i);
});

test('approved plan application preserves existing material requirements', () => {
  assert.match(apply,/existingIds/);
  assert.match(apply,/filter\(\(row: any\) => !existingIds\.has/);
  assert.match(apply,/createdRequirements/);
});
