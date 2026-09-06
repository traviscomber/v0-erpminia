import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboardUrl = new URL('../components/production/geologia-dashboard.tsx', import.meta.url);
const todayUrl = new URL('../components/production/geologia-today-decision-board.tsx', import.meta.url);
const resultsUrl = new URL('../components/production/geologia-results-decision-board.tsx', import.meta.url);
const mineOverviewUrl = new URL('../components/production/geologia-mine-evidence-overview.tsx', import.meta.url);
const apiUrl = new URL('../app/api/produccion/geologia/route.ts', import.meta.url);

test('geology dashboard labels historical chemistry separately from drill samples', async () => {
  const dashboard = await readFile(dashboardUrl, 'utf8');
  const today = await readFile(todayUrl, 'utf8');
  assert.match(dashboard, /Química histórica/);
  assert.match(dashboard, /chemistryLinkedToHole/);
  assert.match(today, /Química histórica/);
  assert.match(today, /no los convierte en ensayes de sondaje/i);
  assert.doesNotMatch(today, /Muestras validadas/);
});

test('results view preserves punteo and process chemistry lineage without drill attribution', async () => {
  const results = await readFile(resultsUrl, 'utf8');
  assert.match(results, /special_punteo/);
  assert.match(results, /process_special/);
  assert.match(results, /no los convierte en muestras de sondaje/i);
  assert.match(results, /No mezclar ley de cabeza, punteo, muestra de proceso, ensayo de sondaje/i);
  assert.match(results, /Sin vínculo/);
});

test('mine readiness keeps chemistry outside structural readiness', async () => {
  const mineOverview = await readFile(mineOverviewUrl, 'utf8');
  assert.match(mineOverview, /Química histórica/);
  assert.match(mineOverview, /se muestra aparte por mina/);
  assert.match(mineOverview, /no se interpreta como ensayo de sondaje/i);
});

test('geology API preserves explicit drill_hole_id instead of inferring chemistry linkage', async () => {
  const api = await readFile(apiUrl, 'utf8');
  assert.match(api, /drill_hole_id: sample\?\.drill_hole_id \|\| null/);
  assert.match(api, /no se asignan a sondajes sin evidencia/i);
});
