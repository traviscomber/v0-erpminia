import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const inboxRoute = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');
const recordRoute = await readFile(new URL('../app/api/actions/hse-record/[kind]/[id]/route.ts', import.meta.url), 'utf8');
const actionPage = await readFile(new URL('../app/dashboard/sostenibilidad/prevencion-riesgos/acciones/[kind]/[id]/page.tsx', import.meta.url), 'utf8');

test('role inbox deep-links incidents and risks to their HSE action record', () => {
  assert.match(inboxRoute, /kind === 'incident' \|\| kind === 'risk'/);
  assert.match(inboxRoute, /prevencion-riesgos\/acciones\/\$\{kind\}\/\$\{rawId\}/);
});

test('HSE record API authorizes through the cargo task boundary before reading legacy sources', () => {
  assert.match(recordRoute, /\.from\('role_task_frontend_v1'\)/);
  assert.match(recordRoute, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(recordRoute, /\.eq\('cargo_id', profile\.cargo_id\)/);
  assert.match(recordRoute, /\.eq\('task_key', taskKey\)/);
  assert.match(recordRoute, /authorizationBoundary: 'role_task_frontend_v1'/);
  assert.match(recordRoute, /\.from\('incidents'\)/);
  assert.match(recordRoute, /\.from\('risk_matrix'\)/);
});

test('HSE action workspace stays read-only and exposes cargo-specific action evidence', () => {
  assert.match(actionPage, /Qué corresponde hacer/);
  assert.match(actionPage, /data\.task\.role_action/);
  assert.match(actionPage, /No modifica automáticamente el incidente ni el riesgo/);
  assert.doesNotMatch(actionPage, /method:\s*['\"](?:POST|PATCH|PUT|DELETE)['\"]/);
});
