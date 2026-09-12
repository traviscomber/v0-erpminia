import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const accessSource = fs.readFileSync('lib/intelligence/operational-domain-access.ts', 'utf8');
const routes = [
  ['inventory', 'BODEGA_INVENTARIO'],
  ['procurement', 'FIN_COMPRAS'],
  ['production', 'PROD_OPERACIONES'],
  ['finance', 'FIN_FINANZAS'],
];

test('operational domain access maps all four canonical modules', () => {
  assert.match(accessSource, /inventory:\s*MODULE_KEYS\.BODEGA_INVENTARIO/);
  assert.match(accessSource, /procurement:\s*MODULE_KEYS\.FIN_COMPRAS/);
  assert.match(accessSource, /production:\s*MODULE_KEYS\.PROD_OPERACIONES/);
  assert.match(accessSource, /finance:\s*MODULE_KEYS\.FIN_FINANZAS/);
  assert.match(accessSource, /getUserModuleAccess\(userId\)/);
  assert.match(accessSource, /isAdminRole\(role\)/);
  assert.match(accessSource, /access\[OPERATIONAL_DOMAIN_MODULE_KEYS\[domain\]\]/);
});

test('all four assistant routes delegate cross-domain visibility to the shared resolver', () => {
  for (const [domain, primaryModule] of routes) {
    const route = fs.readFileSync(`app/api/${domain === 'procurement' ? 'procurement' : domain}/assistant/route.ts`, 'utf8');
    assert.match(route, new RegExp(`requireModuleAccess\\(request, MODULE_KEYS\\.${primaryModule}\\)`));
    assert.match(route, /resolveAllowedOperationalDomains\(/);
    assert.match(route, new RegExp(`primaryDomain:\\s*'${domain}'`));
    assert.match(route, /handlePersistentOperationalDomainAssistant\(/);
    assert.match(route, /allowedDomains,/);
  }
});

test('routes do not hard-code asymmetric secondary domain pairs anymore', () => {
  for (const [domain] of routes) {
    const route = fs.readFileSync(`app/api/${domain}/assistant/route.ts`, 'utf8');
    assert.doesNotMatch(route, /allowedDomains:\s*.*\?\s*\[/);
    assert.doesNotMatch(route, /Promise\.all\(\[\s*requireModuleAccess/);
  }
});
