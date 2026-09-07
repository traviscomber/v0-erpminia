import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const queueUrl = new URL('../components/production/geologia-pending-decision-queue.tsx', import.meta.url);
const todayUrl = new URL('../components/production/geologia-today-decision-board.tsx', import.meta.url);
const apiUrl = new URL('../app/api/produccion/geologia/route.ts', import.meta.url);
const immediateUrl = new URL('../components/production/geologia-immediate-task-queue.tsx', import.meta.url);

test('geology task queue separates active human review from broad source coverage gaps', async () => {
  const source = await readFile(queueUrl, 'utf8');

  assert.match(source, /GeologiaImmediateTaskQueue/);
  assert.match(source, /Otras revisiones humanas/);
  assert.match(source, /Conflictos, reconciliaciones y validaciones abiertas/);
  assert.match(source, /Cobertura documental, no cola de tareas/);
  assert.match(source, /Revisiones de ubicación operacionales/);
  assert.match(source, /Reportes por reconciliar/);
  assert.match(source, /no se convierte automáticamente en cientos de tareas/i);
  assert.match(source, /const activePending=/);
  assert.match(source, /const historicalPending=/);
  assert.match(source, /operational_bucket/);
  assert.match(source, /Backlog histórico separado/);
  assert.match(source, /activePending\.slice\(0,100\)/);
  assert.match(source, /\(b\.operational_priority\?\?-1\)-\(a\.operational_priority\?\?-1\)/);
  assert.doesNotMatch(source, /pending\.slice\(0,100\)/);
  assert.doesNotMatch(source, /label="Ubicación pendiente"/);
  assert.doesNotMatch(source, /label="Sin propósito"/);
});

test('geology API and today board keep historical reconciliation out of daily priority', async () => {
  const [api, today] = await Promise.all([
    readFile(apiUrl, 'utf8'),
    readFile(todayUrl, 'utf8'),
  ]);

  assert.match(api, /production_drill_hole_location_review_queue_v5/);
  assert.match(api, /\.order\('operational_priority', \{ ascending: false \}\)/);
  assert.match(api, /const operationalLocationRows = openLocationRows\.filter/);
  assert.match(api, /operational_bucket \|\| ''\)\.toLowerCase\(\) !== 'historico'/);
  assert.match(api, /const historicalLocationRows = openLocationRows\.filter/);
  assert.match(api, /const unresolvedLocations = operationalLocationRows\.length/);
  assert.match(api, /totalOpenLocationReviews/);
  assert.match(api, /historicalLocationReviews/);
  assert.match(api, /criticalLocationReviews/);

  assert.match(today, /const operationalPending=/);
  assert.match(today, /const historicalPending=/);
  assert.match(today, /operational_priority/);
  assert.match(today, /\(b\.operational_priority\?\?-1\)-\(a\.operational_priority\?\?-1\)/);
  assert.match(today, /Resolver reconciliaciones operacionales/);
  assert.match(today, /backlog histórico separado/);
  assert.match(today, /active:operationalPending\.length>0/);
});

test('immediate geology tasks use canonical evidence and keep human validation explicit', async () => {
  const source = await readFile(immediateUrl, 'utf8');

  assert.match(source, /\/api\/produccion\/geologia\/canonical/);
  assert.match(source, /Tareas geológicas inmediatas · 2026/);
  assert.match(source, /Casos con evidencia suficiente para una acción humana/);
  assert.match(source, /No incluye ausencias masivas de collar, survey, logging ni química/);
  assert.match(source, /evidencia primaria y validarla humanamente/);
  assert.match(source, /Topografía por recuperar/);
  assert.match(source, /Setup por recuperar/);
});
