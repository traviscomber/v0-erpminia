import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  'supabase/migrations/20260829194226_link_preventive_standard_plan_to_generated_work_order_v1.sql',
  'utf8',
);

test('generated preventive work order inherits the approved active schedule plan', () => {
  assert.match(migration, /a\.preventive_schedule_id = s\.id/);
  assert.match(migration, /a\.status = 'active'/);
  assert.match(migration, /p\.status = 'approved'/);
  assert.match(migration, /insert into public\.maintenance_standard_job_plan_applications\([\s\S]*?plan_id,[\s\S]*?work_order_id,[\s\S]*?status/);
  assert.match(migration, /s\.organization_id,[\s\S]*?v_plan_id,[\s\S]*?v_id,[\s\S]*?'active'/);
});

test('schedule plan remains a template while the generated work order gets its own application', () => {
  assert.doesNotMatch(migration, /update public\.maintenance_standard_job_plan_applications[\s\S]*?set[\s\S]*?work_order_id/i);
  assert.match(migration, /preventive_schedule_id = s\.id/);
  assert.match(migration, /work_order_id = s\.generated_work_order_id/);
});

test('regenerating an active preventive order is idempotent and repairs a missing plan link', () => {
  assert.match(migration, /s\.generated_work_order_id is not null/);
  assert.match(migration, /status not in \('completed', 'closed', 'cancelled'\)/);
  assert.match(migration, /not exists \([\s\S]*?a\.work_order_id = s\.generated_work_order_id[\s\S]*?a\.status = 'active'/);
  assert.match(migration, /return s\.generated_work_order_id/);
});

test('preventive schedule generation remains server-only', () => {
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path to 'public', 'canonical'/i);
  assert.match(migration, /revoke all on function public\.create_work_order_from_schedule\(uuid, uuid\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.create_work_order_from_schedule\(uuid, uuid\) to service_role/i);
});
