import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rpcPath = new URL('../supabase/migrations/20260827100500_lock_down_role_task_rpc_execution.sql', import.meta.url);
const viewsPath = new URL('../supabase/migrations/20260827101000_lock_down_role_task_backend_views.sql', import.meta.url);
const invokerPath = new URL('../supabase/migrations/20260827101500_set_active_role_task_views_security_invoker.sql', import.meta.url);
const sourcePath = new URL('../supabase/migrations/20260827102000_lock_down_operational_task_sources_and_sla.sql', import.meta.url);

test('role task RPCs are not executable by public or anon', async () => {
  const sql = await readFile(rpcPath, 'utf8');
  assert.match(sql, /resolve_role_task[\s\S]*from public, anon/);
  assert.match(sql, /set_my_operational_task_state[\s\S]*from public, anon/);
  assert.match(sql, /set_role_task_personal_state[\s\S]*from public, anon/);
  assert.match(sql, /to authenticated, service_role/);
});

test('role task backend views are service-role only', async () => {
  const sql = await readFile(viewsPath, 'utf8');
  assert.match(sql, /role_task_frontend_v1 from anon, authenticated/);
  assert.match(sql, /role_task_worklist_v1 from anon, authenticated/);
  assert.match(sql, /role_task_escalations_v1 from anon, authenticated/);
  assert.match(sql, /to service_role/);
});

test('active role task views use security invoker semantics', async () => {
  const sql = await readFile(invokerPath, 'utf8');
  for (const view of ['role_tasks_actionable_v1','role_task_escalations_v1','role_task_worklist_v1','role_task_personal_inbox_v1','role_task_frontend_v1']) {
    assert.match(sql, new RegExp(`alter view public\\.${view} set \\(security_invoker = true\\)`));
  }
});

test('operational task sources and SLA policy are not client-readable', async () => {
  const sql = await readFile(sourcePath, 'utf8');
  assert.match(sql, /operational_tasks_by_cargo_v7 from anon, authenticated/);
  assert.match(sql, /operational_task_sla_policies enable row level security/);
  assert.match(sql, /operational_task_sla_policies from anon, authenticated/);
  assert.match(sql, /operational_task_sla_policies to service_role/);
});
