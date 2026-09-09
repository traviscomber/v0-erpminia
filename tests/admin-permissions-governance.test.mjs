import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/admin/permissions/page.tsx', import.meta.url);
const routeUrl = new URL('../app/api/admin/permissions/route.ts', import.meta.url);
const accessUrl = new URL('../lib/api/module-access.ts', import.meta.url);

test('individual permissions UI redirects to governed roles and cargos', async () => {
  const page = await readFile(pageUrl, 'utf8');
  assert.match(page, /redirect\('\/dashboard\/admin\/roles'\)/);
});

test('legacy individual permission mutations are closed server-side', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /LEGACY_INDIVIDUAL_PERMISSIONS_DISABLED/);
  assert.match(route, /status: 410/);
  assert.doesNotMatch(route, /grantUserPermission/);
  assert.doesNotMatch(route, /revokeUserPermission/);
});

test('effective module access remains cargo role-matrix based', async () => {
  const access = await readFile(accessUrl, 'utf8');
  assert.match(access, /from\('role_matrix'\)/);
  assert.match(access, /profile\.cargo_id/);
  assert.doesNotMatch(access, /from\('user_permissions'\)/);
});
