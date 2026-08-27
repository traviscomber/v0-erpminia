import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const inboxRoute = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');
const bodegaPage = await readFile(new URL('../app/dashboard/bodega/page.tsx', import.meta.url), 'utf8');

test('negative-stock data health opens the filtered inventory queue', () => {
  assert.match(inboxRoute, /rawId === 'inventory'/);
  assert.match(inboxRoute, /rest\[0\] === 'negative_stock'/);
  assert.match(inboxRoute, /\/dashboard\/bodega\?status=negative&dataHealth=negative_stock/);
});

test('inventory initializes and explains the negative-stock review mode', () => {
  assert.match(bodegaPage, /useSearchParams/);
  assert.match(bodegaPage, /searchParams\.get\('status'\)/);
  assert.match(bodegaPage, /negativeStockMode/);
  assert.match(bodegaPage, /Motil no ajusta cantidades automáticamente/);
  assert.match(bodegaPage, /No quedan saldos negativos/);
});
