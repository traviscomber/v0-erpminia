import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const nav = fs.readFileSync(new URL('../components/layout/management-context-nav.tsx', import.meta.url), 'utf8');

test('management context mirrors server permission boundaries', () => {
  assert.match(nav, /useModuleAccess/);
  assert.match(nav, /prod_operaciones/);
  assert.match(nav, /mant_gerencial/);
  assert.match(nav, /bodega_inventario/);
  assert.match(nav, /fin_compras/);
  assert.match(nav, /fin_finanzas/);
  assert.match(nav, /core_desempeno/);
  assert.match(nav, /mant_operaciones/);
  assert.match(nav, /visibleItems = ready \? items\.filter/);
  assert.match(nav, /if \(!ready \|\| visibleItems\.length === 0\) return null/);
});
