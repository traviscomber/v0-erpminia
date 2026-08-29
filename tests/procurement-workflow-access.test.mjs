import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../app/api/procurement/workflow/route.ts', import.meta.url);
const moduleAccessUrl = new URL('../lib/api/module-access.ts', import.meta.url);

function getHandlerSource(source, method, nextMethod = null) {
  const start = source.indexOf(`export async function ${method}`);
  assert.notEqual(start, -1, `${method} handler must exist`);
  const end = nextMethod ? source.indexOf(`export async function ${nextMethod}`, start) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
}

test('procurement workflow GET requires FIN_COMPRAS read access', async () => {
  const source = await readFile(routeUrl, 'utf8');
  const getSource = getHandlerSource(source, 'GET', 'POST');

  assert.match(getSource, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS\)/);
  assert.doesNotMatch(getSource, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS,\s*true\)/);
  assert.ok(
    getSource.indexOf('requireModuleAccess') < getSource.indexOf('getOrganizationContext'),
    'module read authorization must happen before organization data access',
  );
});

test('procurement workflow POST requires FIN_COMPRAS write access before every privileged RPC', async () => {
  const source = await readFile(routeUrl, 'utf8');
  const postSource = getHandlerSource(source, 'POST');

  assert.match(postSource, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS,\s*true\)/);
  assert.ok(
    postSource.indexOf('requireModuleAccess') < postSource.indexOf('getOrganizationContext'),
    'write authorization must happen before organization context',
  );

  for (const rpc of [
    "rpc('create_procurement_request'",
    "rpc('create_supplier_quotation'",
    "rpc('award_supplier_quotation'",
    "rpc('receive_purchase_order'",
  ]) {
    assert.ok(
      postSource.indexOf('requireModuleAccess') < postSource.indexOf(rpc),
      `write authorization must happen before ${rpc}`,
    );
  }
});

test('FIN_COMPRAS LEC access remains read-only', async () => {
  const source = await readFile(moduleAccessUrl, 'utf8');

  assert.match(source, /const canWrite = accessLevel === 'ED';/);
  assert.match(source, /const canRead = accessLevel === 'ED' \|\| accessLevel === 'LEC';/);
  assert.match(source, /const allowed = requireWrite \? canWrite : canRead;/);
});
