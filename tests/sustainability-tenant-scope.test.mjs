import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const overview = await readFile(
  new URL('../app/api/sostenibilidad/dashboard/overview/route.ts', import.meta.url),
  'utf8',
);

test('sustainability dashboard uses the authorized organization context', () => {
  assert.match(overview, /const orgId = access\.organizationId/);
  assert.doesNotMatch(overview, /auth\.getSession\(\)/);
  assert.doesNotMatch(overview, /from\('profiles'\)[\s\S]*select\('organization_id'\)/);
});

test('sustainability aggregate sources are tenant-scoped', () => {
  assert.doesNotMatch(overview, /rpc\('get_nc_stats'/);
  assert.doesNotMatch(overview, /rpc\('get_ca_stats'/);
  assert.match(overview, /from\('sostenibilidad_nonconformances'\)[\s\S]*\.eq\('organization_id', orgId\)/);
  assert.match(overview, /from\('sostenibilidad_corrective_actions'\)[\s\S]*\.eq\('organization_id', orgId\)/);
});

test('sustainability period input is validated before querying', () => {
  assert.match(overview, /\^\(\\d\{4\}\)-\(\\d\{2\}\)\$/);
  assert.match(overview, /Período inválido/);
});
