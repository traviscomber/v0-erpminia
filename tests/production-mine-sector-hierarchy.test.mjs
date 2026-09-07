import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/produccion/inteligencia/page.tsx', import.meta.url);
const layoutUrl = new URL('../app/dashboard/produccion/layout.tsx', import.meta.url);

test('step two opens Mine Sector before transversal analysis', async () => {
  const [page, layout] = await Promise.all([
    readFile(pageUrl, 'utf8'),
    readFile(layoutUrl, 'utf8'),
  ]);

  assert.match(layout, /label: 'Mina \/ Sector'.*step: 2/);
  const mineSectorIndex = page.indexOf('<MineSectorIntelligence />');
  const detailsIndex = page.indexOf('<details');
  assert.ok(mineSectorIndex >= 0, 'Mine Sector workspace must exist');
  assert.ok(detailsIndex > mineSectorIndex, 'transversal analysis must follow Mine Sector');
  assert.match(page, /Análisis complementario/);
  assert.match(page, /No forman parte de la lectura primaria Mina \/ Sector/);
  assert.doesNotMatch(page, /<details[^>]*open/);
});

test('transversal production analysis remains available without becoming the primary Mine Sector screen', async () => {
  const page = await readFile(pageUrl, 'utf8');

  for (const component of [
    'ProductionConfidencePanel',
    'ProductionForecastPanel',
    'ProductionTrendIntelligence',
    'DrillingEquipmentTrend',
  ]) {
    assert.match(page, new RegExp(`<${component} \\/>`));
  }
});
