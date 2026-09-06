import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const boundaryUrl = new URL('../lib/geology-ai/interval-evidence-boundary.ts', import.meta.url);
const assistantUrl = new URL('../app/api/produccion/geologia/assistant/route.ts', import.meta.url);

test('assistant interval boundary is tenant scoped and read only', async () => {
  const boundary = await readFile(boundaryUrl, 'utf8');
  assert.match(boundary, /production_drill_intervals/);
  assert.match(boundary, /eq\('organization_id', args\.organizationId\)/);
  assert.doesNotMatch(boundary, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});

test('assistant receives explicit operational-versus-formal logging boundary', async () => {
  const [boundary, assistant] = await Promise.all([
    readFile(boundaryUrl, 'utf8'),
    readFile(assistantUrl, 'utf8'),
  ]);
  assert.match(boundary, /operational_source_interval/);
  assert.match(boundary, /explicit_formal_logging/);
  assert.match(boundary, /No equivalen a logging geológico formal/i);
  assert.match(assistant, /buildIntervalEvidenceBoundary/);
  assert.match(assistant, /FRONTERA DE PROCEDENCIA DE INTERVALOS/);
  assert.match(assistant, /nunca deben presentarse como logging geológico formal/i);
  assert.match(assistant, /No infieras RQD, recuperación, alteración, muestreo, contactos ni continuidad/i);
});
