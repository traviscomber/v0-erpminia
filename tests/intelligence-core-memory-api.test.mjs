import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/intelligence/memory/route.ts', import.meta.url);
const source = await readFile(routeUrl, 'utf8');

test('memory API is scoped to authenticated organization and user', () => {
  assert.match(source, /getOrganizationContext\(request\)/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(source, /\.eq\('user_id', context\.userId\)/);
});

test('memory API exposes only controlled Core domains', () => {
  for (const domain of ['executive', 'inventory', 'procurement', 'production', 'finance', 'documents', 'data_health']) {
    assert.match(source, new RegExp(`'${domain}'`));
  }
  assert.doesNotMatch(source, /'maintenance'|'geology'/);
});

test('memory API defaults to active rows and supports explicit user reactivation or deactivation', () => {
  assert.match(source, /includeInactive/);
  assert.match(source, /\.eq\('active', true\)/);
  assert.match(source, /action !== 'set_active'/);
  assert.match(source, /typeof body\?\.active !== 'boolean'/);
  assert.match(source, /\.update\(\{ active: body\.active, updated_at: now \}\)/);
});

test('memory API changes only non-canonical memory metadata', () => {
  assert.match(source, /operationalMutationExecuted: false/);
  assert.doesNotMatch(source, /maintenance_work_orders|canonical_inventory_current|canonical_purchase_orders_current|production_/);
});
