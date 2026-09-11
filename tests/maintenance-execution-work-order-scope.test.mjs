import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/maintenance/work-orders/route.ts', import.meta.url), 'utf8');

test('execution work-order reads are scoped to the authenticated operational person', () => {
  assert.match(route, /resolveMaintenanceViewerMode/);
  assert.match(route, /\.from\('profiles'\)/);
  assert.match(route, /\.from\('cargos'\)/);
  assert.match(route, /\.from\('people'\)/);
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /\.eq\('profile_id', context\.userId\)/);
  assert.match(route, /\.eq\('assigned_person_id', person\.id\)/);
});

test('execution work-order reads fail closed when the profile is not linked to a person', () => {
  assert.match(route, /executionWithoutPerson/);
  assert.match(route, /workOrders: \[\]/);
});
