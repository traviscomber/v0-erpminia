import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const queueUrl = new URL('../components/production/geologia-pending-decision-queue.tsx', import.meta.url);

test('geology task queue separates active human review from broad source coverage gaps', async () => {
  const source = await readFile(queueUrl, 'utf8');

  assert.match(source, /Sólo decisiones que realmente requieren intervención/);
  assert.match(source, /Cobertura documental, no cola de tareas/);
  assert.match(source, /Revisiones de ubicación/);
  assert.match(source, /Reportes por reconciliar/);
  assert.match(source, /no se convierte automáticamente en cientos de tareas/i);
  assert.doesNotMatch(source, /label="Ubicación pendiente"/);
  assert.doesNotMatch(source, /label="Sin propósito"/);
});
