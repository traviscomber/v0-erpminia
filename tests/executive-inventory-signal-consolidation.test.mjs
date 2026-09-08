import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routePath = new URL('../app/api/dashboard/ia-operacional/route.ts', import.meta.url);
const pagePath = new URL('../app/dashboard/decisiones/page.tsx', import.meta.url);

test('executive feed consolidates low stock into one non-critical replenishment signal', async () => {
  const route = await readFile(routePath, 'utf8');

  assert.match(route, /const zeroStockItems = lowStockItems\.filter/);
  assert.match(route, /const belowMinimumWithStock = lowStockItems\.filter/);
  assert.match(route, /id: 'inventory-reorder-attention'/);
  assert.match(route, /severity: 'warning'/);
  assert.match(route, /sourceId: 'inventory-stock-alerts'/);
  assert.match(route, /señal de reposición, no criticidad operacional del repuesto/i);
  assert.doesNotMatch(route, /lowStockItems\.forEach/);
  assert.match(route, /lowStock: lowStockItems\.length/);
  assert.match(route, /zeroStock: zeroStockItems\.length/);
});

test('executive UI describes its ten-item viewport without claiming every critical card is visible', async () => {
  const page = await readFile(pagePath, 'utf8');

  assert.match(page, /Se muestran hasta 10 decisiones prioritarias/);
  assert.match(page, /Las críticas se ordenan primero/);
  assert.match(page, /detail="Prioridad máxima"/);
  assert.doesNotMatch(page, /una crítica nunca se oculta/i);
});
