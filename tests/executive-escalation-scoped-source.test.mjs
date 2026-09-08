import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routePath = new URL('../app/api/dashboard/executive-escalations/route.ts', import.meta.url);

test('executive escalations avoid the expensive escalation view and preserve tenant scoping', async () => {
  const source = await readFile(routePath, 'utf8');

  assert.match(source, /from\('role_tasks_by_cargo_v1'\)/);
  assert.match(source, /from\('operational_task_sla_policies'\)/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(source, /\.eq\('responsibility', 'owner'\)/);
  assert.doesNotMatch(source, /from\('role_task_escalations_v1'\)/);
});

test('executive escalation semantics remain derived from canonical SLA policy', async () => {
  const source = await readFile(routePath, 'utf8');

  assert.match(source, /policy\.escalation_hours/);
  assert.match(source, /policy\.due_hours/);
  assert.match(source, /policy\.escalation_cargo_name/);
  assert.match(source, /Math\.min\(100, \(task\.priority_score \|\| 0\) \+ 15\)/);
  assert.match(source, /urgency_state: 'escalated'/);
  assert.match(source, /responsibility: 'escalation'/);
});

test('executive escalations still fail soft only for statement timeout', async () => {
  const source = await readFile(routePath, 'utf8');

  assert.match(source, /sourceError\.code === '57014'/);
  assert.match(source, /available: false/);
  assert.match(source, /summary: null/);
  assert.match(source, /reason/);
  assert.match(source, /status: 500/);
  assert.match(source, /available: true/);
});
