import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const evidenceUrl = new URL('../components/production/geologia-hole-evidence-readiness.tsx', import.meta.url);

test('hole evidence shows accredited layers without turning source gaps into a quality score or task queue', async () => {
  const source = await readFile(evidenceUrl, 'utf8');

  assert.match(source, /Evidencia disponible/);
  assert.match(source, /Límites de la fuente actual/);
  assert.match(source, /no se interpreta como defecto del sondaje ni como trabajo pendiente/i);
  assert.match(source, /no se convierte en una tarea automática ni en un score de calidad/i);
  assert.doesNotMatch(source, /Preparación de evidencia/);
  assert.doesNotMatch(source, /Siguiente acción de datos/);
  assert.doesNotMatch(source, /readiness/);
  assert.doesNotMatch(source, />Pendiente</);
});
