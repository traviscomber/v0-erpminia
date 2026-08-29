import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../app/api/procurement/supplier-control/route.ts', import.meta.url);

function getHandlerSource(source, method, nextMethod = null) {
  const start = source.indexOf(`export async function ${method}`);
  assert.notEqual(start, -1, `${method} handler must exist`);
  const end = nextMethod ? source.indexOf(`export async function ${nextMethod}`, start) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
}

test('supplier control GET requires FIN_COMPRAS read access before organization data', async () => {
  const source = await readFile(routeUrl, 'utf8');
  const handler = getHandlerSource(source, 'GET', 'POST');

  assert.match(handler, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS\)/);
  assert.doesNotMatch(handler, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS,\s*true\)/);
  assert.ok(handler.indexOf('requireModuleAccess') < handler.indexOf('getOrganizationContext'));
});

test('supplier control POST requires FIN_COMPRAS write access before return and invoice mutations', async () => {
  const source = await readFile(routeUrl, 'utf8');
  const handler = getHandlerSource(source, 'POST');

  assert.match(handler, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS,\s*true\)/);
  assert.ok(handler.indexOf('requireModuleAccess') < handler.indexOf('getOrganizationContext'));

  for (const mutation of ["from('procurement_supplier_returns').insert", "from('procurement_supplier_invoices').insert"]) {
    assert.ok(handler.indexOf('requireModuleAccess') < handler.indexOf(mutation), `write guard must execute before ${mutation}`);
  }
});
