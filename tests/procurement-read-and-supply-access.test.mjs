import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routes = {
  forecast: new URL('../app/api/procurement/forecast/route.ts', import.meta.url),
  intelligence: new URL('../app/api/procurement/intelligence/route.ts', import.meta.url),
  suppliers360: new URL('../app/api/procurement/suppliers-360/route.ts', import.meta.url),
  supplyNeeds: new URL('../app/api/procurement/supply-needs/route.ts', import.meta.url),
};

function getHandlerSource(source, method, nextMethod = null) {
  const start = source.indexOf(`export async function ${method}`);
  assert.notEqual(start, -1, `${method} handler must exist`);
  const end = nextMethod ? source.indexOf(`export async function ${nextMethod}`, start) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
}

for (const [name, url] of Object.entries({ forecast: routes.forecast, intelligence: routes.intelligence, suppliers360: routes.suppliers360 })) {
  test(`${name} GET requires FIN_COMPRAS read access before organization context`, async () => {
    const source = await readFile(url, 'utf8');
    const handler = getHandlerSource(source, 'GET');
    assert.match(handler, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS\)/);
    assert.doesNotMatch(handler, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS,\s*true\)/);
    assert.ok(handler.indexOf('requireModuleAccess') < handler.indexOf('getOrganizationContext'));
  });
}

test('supply-needs GET is read-gated and POST is write-gated before conversion RPC', async () => {
  const source = await readFile(routes.supplyNeeds, 'utf8');
  const getSource = getHandlerSource(source, 'GET', 'POST');
  const postSource = getHandlerSource(source, 'POST');

  assert.match(getSource, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS\)/);
  assert.doesNotMatch(getSource, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS,\s*true\)/);
  assert.ok(getSource.indexOf('requireModuleAccess') < getSource.indexOf('getOrganizationContext'));

  assert.match(postSource, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS,\s*true\)/);
  assert.ok(postSource.indexOf('requireModuleAccess') < postSource.indexOf('getOrganizationContext'));
  assert.ok(postSource.indexOf('requireModuleAccess') < postSource.indexOf("rpc('convert_supply_need_to_intake_request'"));
});
