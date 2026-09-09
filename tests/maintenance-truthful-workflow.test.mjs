import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const layoutUrl = new URL('../app/dashboard/mantenimiento/layout.tsx', import.meta.url);
const preventiveUrl = new URL('../components/maintenance/preventive-plan-board.tsx', import.meta.url);
const indicatorsUrl = new URL('../components/maintenance/maintenance-indicators-board.tsx', import.meta.url);

test('maintenance primary flow ends in controlled close and keeps imputacion as support', async () => {
  const source = await readFile(layoutUrl, 'utf8');
  assert.match(source, /ordenes-trabajo\/cierre', label: 'Cierre', step: 3/);
  assert.match(source, /ordenes-trabajo\/imputacion', label: 'Imputación'/);
  assert.match(source, /!pathname\.startsWith\('\/dashboard\/mantenimiento\/ordenes-trabajo\/cierre'\)/);
});

test('preventive planning never turns an unavailable source into zero plans', async () => {
  const source = await readFile(preventiveUrl, 'utf8');
  assert.match(source, /const metricValue =/);
  assert.match(source, /isLoading \|\| error \|\| !summary/);
  assert.match(source, /Planificación preventiva no disponible/);
  assert.match(source, /error \? null : ordered\.length === 0/);
});

test('maintenance indicators keep source failures explicit', async () => {
  const source = await readFile(indicatorsUrl, 'utf8');
  assert.match(source, /if \(!response\.ok\) throw new Error/);
  assert.match(source, /value == null \? '—'/);
  assert.match(source, /const availabilityValue = mttrAvailability \?\? catalogAvailability/);
  assert.match(source, /ordersAvailable \? completedOrders : '—'/);
  assert.match(source, /Indicadores parcialmente disponibles/);
});
