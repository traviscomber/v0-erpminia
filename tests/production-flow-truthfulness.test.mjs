import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const transportUrl = new URL('../components/production/mineral-transport-dashboard.tsx', import.meta.url);
const plantUrl = new URL('../components/production/plant-metallurgy-dashboard.tsx', import.meta.url);

test('transport keeps missing tonnage explicit instead of rendering zero', async () => {
  const dashboard = await readFile(transportUrl, 'utf8');

  assert.match(dashboard, /normalized_metric_tons==null\?'—':tons\(Number\(r\.normalized_metric_tons\),2\)/);
  assert.doesNotMatch(dashboard, /tons\(Number\(r\.normalized_metric_tons\|\|0\),2\)/);
});

test('plant derives valid shipment count from current canonical daily evidence', async () => {
  const dashboard = await readFile(plantUrl, 'utf8');

  assert.match(dashboard, /validShipmentRows=data\?\.daily\?\.reduce\(\(sum,row\)=>sum\+row\.validShipmentRows,0\)\?\?0/);
  assert.match(dashboard, /\{validShipmentRows\} válidos \+ \{p\.reviewShipmentRows\} en revisión/);
  assert.doesNotMatch(dashboard, /13 válidos/);
});
