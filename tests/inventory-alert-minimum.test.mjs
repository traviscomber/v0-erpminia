import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const helperUrl = new URL('../lib/inventory-alerts.ts', import.meta.url);
const guardedSources = [
  '../app/api/alertas/route.ts',
  '../app/api/bodega/reorder-alerts/route.ts',
  '../app/api/warehouse/reorder/route.ts',
  '../app/dashboard/inventario/page.tsx',
  '../lib/api/dashboard-snapshot.ts',
];

test('stock alerts require a configured positive minimum', async () => {
  const helper = await readFile(helperUrl, 'utf8');

  assert.match(helper, /Number\.isFinite\(minimum\) && minimum > 0/);
  assert.match(helper, /if \(!hasConfiguredStockMinimum\(minimumValue\)\) return false/);
});

test('primary inventory alert surfaces share the positive-minimum guard', async () => {
  const sources = await Promise.all(
    guardedSources.map(async (path) => ({
      path,
      content: await readFile(new URL(path, import.meta.url), 'utf8'),
    })),
  );

  for (const source of sources) {
    assert.match(
      source.content,
      /isStockBelowMinimum/,
      `${source.path} must exclude stock without a configured minimum`,
    );
  }
});
