import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const inboxRoute = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');
const importPage = await readFile(new URL('../app/dashboard/compras/importar-existencias/page.tsx', import.meta.url), 'utf8');

test('stale inventory data health opens the real import workflow', () => {
  assert.match(inboxRoute, /rawId === 'inventory'/);
  assert.match(inboxRoute, /rest\[0\] === 'freshness'/);
  assert.match(inboxRoute, /\/dashboard\/compras\/importar-existencias\?dataHealth=freshness/);
});

test('inventory import explains freshness debt without fabricating recency', () => {
  assert.match(importPage, /useSearchParams/);
  assert.match(importPage, /freshnessMode/);
  assert.match(importPage, /Actualizar snapshot de Inventario/);
  assert.match(importPage, /Motil no adelanta fechas ni marca la fuente como fresca sin una importación real/);
});
