import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/sostenibilidad/page.tsx', import.meta.url);

test('sustainability keeps source-specific counts and does not fabricate substitute zeros', async () => {
  const page = await readFile(pageUrl, 'utf8');

  assert.match(page, /if \(!response\.ok\) throw new Error/);
  assert.match(page, /exactCount\(payload/);
  assert.match(page, /count === null \? '—'/);
  assert.match(page, /inspecciones\?tipo=externas/);
  assert.match(page, /Inspecciones internas/);
  assert.match(page, /Inspecciones externas/);
  assert.match(page, /no se inventan subtotales de permisos o monitoreos/i);
  assert.match(page, /no se reutiliza como partes interesadas, compromisos y licencia social/i);
  assert.doesNotMatch(page, /emptyOverview/);
  assert.doesNotMatch(page, /count: inspeccionesCount/);
  assert.doesNotMatch(page, /count: ambienteCount/);
  assert.doesNotMatch(page, /count: comunidadesCount/);
  assert.doesNotMatch(page, /Seguimiento de retorno/);
});
