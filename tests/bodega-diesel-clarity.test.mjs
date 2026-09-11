import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routePath = new URL('../app/api/inventory/intelligence/route.ts', import.meta.url);
const pagePath = new URL('../app/dashboard/bodega/page.tsx', import.meta.url);

test('inventory API exposes tenant-scoped diesel evidence from both current and reference sources', async () => {
  const route = await readFile(routePath, 'utf8');
  assert.match(route, /\.eq\('organization_id', organizationId\)/);
  assert.match(route, /\.eq\('product_code', 'Combustible001'\)/);
  assert.match(route, /canonical_products_v1/);
  assert.match(route, /hasConflict: hasDieselConflict/);
  assert.doesNotMatch(route, /export async function POST/);
});

test('bodega makes conflicting diesel evidence explicit and blocks false certainty', async () => {
  const page = await readFile(pagePath, 'utf8');
  assert.match(page, /Petróleo Diesel/);
  assert.match(page, /Datos en conflicto/);
  assert.match(page, /Registro operativo de Bodega/);
  assert.match(page, /Referencia canónica más reciente/);
  assert.match(page, /No usar esta cifra para compra, consumo ni valorización hasta conciliar el origen/);
});
