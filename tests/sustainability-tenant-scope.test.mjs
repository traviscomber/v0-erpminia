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
  assert.match(overview, /const orgNonconformanceIds =/);

  const caStart = overview.indexOf(".from('sostenibilidad_corrective_actions')");
  const caEnd = overview.indexOf(': Promise.resolve', caStart);
  assert.ok(caStart >= 0 && caEnd > caStart, 'corrective-action query block is missing');
  const caBlock = overview.slice(caStart, caEnd);
  assert.match(caBlock, /\.in\('nc_id', orgNonconformanceIds\)/);
  assert.doesNotMatch(caBlock, /\.eq\('organization_id', orgId\)/);
});

test('sustainability period input is validated before querying', () => {
  assert.match(overview, /\^\(\\d\{4\}\)-\(\\d\{2\}\)\$/);
  assert.match(overview, /Período inválido/);
});
