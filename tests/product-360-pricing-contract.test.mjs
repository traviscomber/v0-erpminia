import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const route = await readFile(new URL('../app/api/inventory/products-360/route.ts', import.meta.url), 'utf8');

test('Product 360 pricing uses canonical product identity', () => {
  assert.match(route, /type PriceBenchmark = \{[\s\S]*canonical_product_id: string;/);
  assert.match(route, /\.select\('canonical_product_id,is_fuel,/);
  assert.match(route, /\.in\('canonical_product_id', productIds\)/);
  assert.match(route, /\.eq\('canonical_product_id', productId\)/);
  assert.doesNotMatch(route, /\.in\('product_id', productIds\)/);
  assert.doesNotMatch(route, /\.eq\('product_id', productId\)/);
});
