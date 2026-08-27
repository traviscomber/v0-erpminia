import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../supabase/migrations/20260827110500_align_personal_task_state_with_current_worklist.sql', import.meta.url);

test('personal task state validates against the current role worklist', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /from public\.role_task_worklist_v1 t/);
  assert.doesNotMatch(sql, /operational_tasks_by_cargo_v3/);
  assert.match(sql, /t\.organization_id=v_org/);
  assert.match(sql, /t\.cargo_id=v_cargo/);
  assert.match(sql, /t\.task_key=p_task_key/);
});

test('personal task state remains authenticated-only', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /revoke all on function public\.set_my_operational_task_state\(text,text,timestamptz\) from anon/);
  assert.match(sql, /grant execute on function public\.set_my_operational_task_state\(text,text,timestamptz\) to authenticated, service_role/);
});
