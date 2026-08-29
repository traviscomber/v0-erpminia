import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../app/api/produccion/sondaje/route.ts', import.meta.url);
const moduleAccessUrl = new URL('../lib/api/module-access.ts', import.meta.url);

function getHandlerSource(source, method, nextMethod = null) {
  const start = source.indexOf(`export async function ${method}`);
  assert.notEqual(start, -1, `${method} handler must exist`);
  const end = nextMethod ? source.indexOf(`export async function ${nextMethod}`, start) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
}

test('sondaje GET remains available to read-only module access', async () => {
  const source = await readFile(routeUrl, 'utf8');
  const getSource = getHandlerSource(source, 'GET', 'POST');

  assert.match(
    getSource,
    /requireModuleAccess\(request,\s*MODULE_KEYS\.PROD_SONDAJE_PRODUCCION\)/,
  );
  assert.doesNotMatch(
    getSource,
    /requireModuleAccess\(request,\s*MODULE_KEYS\.PROD_SONDAJE_PRODUCCION,\s*true\)/,
  );
});

test('sondaje POST requires write access before canonical location mutation', async () => {
  const source = await readFile(routeUrl, 'utf8');
  const postSource = getHandlerSource(source, 'POST');

  assert.match(
    postSource,
    /requireModuleAccess\(request,\s*MODULE_KEYS\.PROD_SONDAJE_PRODUCCION,\s*true\)/,
  );
  assert.ok(
    postSource.indexOf('requireModuleAccess') < postSource.indexOf('getOrganizationContext'),
    'write authorization must happen before organization context and RPC mutation',
  );
  assert.ok(
    postSource.indexOf('requireModuleAccess') < postSource.indexOf("rpc('resolve_drill_hole_location_manual_review'"),
    'write authorization must happen before the location-resolution RPC',
  );
});

test('module access contract keeps LEC read-only when requireWrite is true', async () => {
  const source = await readFile(moduleAccessUrl, 'utf8');

  assert.match(source, /const canWrite = accessLevel === 'ED';/);
  assert.match(source, /const canRead = accessLevel === 'ED' \|\| accessLevel === 'LEC';/);
  assert.match(source, /const allowed = requireWrite \? canWrite : canRead;/);
  assert.match(source, /solo lectura/);
});
