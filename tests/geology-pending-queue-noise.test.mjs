import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const queueUrl = new URL('../components/production/geologia-pending-decision-queue.tsx', import.meta.url);
const immediateUrl = new URL('../components/production/geologia-immediate-task-queue.tsx', import.meta.url);

test('geology task queue separates active human review from broad source coverage gaps', async () => {
  const source = await readFile(queueUrl, 'utf8');

  assert.match(source, /GeologiaImmediateTaskQueue/);
  assert.match(source, /Otras revisiones humanas/);
  assert.match(source, /Conflictos, reconciliaciones y validaciones abiertas/);
  assert.match(source, /Cobertura documental, no cola de tareas/);
  assert.match(source, /Revisiones de ubicación/);
  assert.match(source, /Reportes por reconciliar/);
  assert.match(source, /no se convierte automáticamente en cientos de tareas/i);
  assert.doesNotMatch(source, /label="Ubicación pendiente"/);
  assert.doesNotMatch(source, /label="Sin propósito"/);
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