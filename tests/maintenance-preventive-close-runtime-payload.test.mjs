import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827235000_fix_preventive_close_runtime_payload_v1.sql', 'utf8');

test('preventive close initializes runtime payload scalars instead of reading an unassigned record', () => {
  assert.match(migration, /v_runtime_evidence_status text := null/);
  assert.match(migration, /v_runtime_reading_id uuid := null/);
  assert.match(migration, /if lower\(coalesce\(v_wo\.work_type,''\)\)='correctivo' then/);
  assert.match(migration, /into v_runtime_evidence_status,v_runtime_reading_id/);
  assert.doesNotMatch(migration, /v_runtime_evidence\.evidence_status/);
  assert.doesNotMatch(migration, /v_runtime_evidence\.runtime_reading_id/);
});

test('work order close event records nullable runtime evidence safely for preventive orders', () => {
  assert.match(migration, /'runtime_evidence_status',v_runtime_evidence_status/);
  assert.match(migration, /'runtime_reading_id',v_runtime_reading_id/);
  assert.match(migration, /'standard_plan_pending_steps',v_pending_plan_steps/);
});
