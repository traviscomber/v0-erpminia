import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/decisiones/page.tsx', import.meta.url);

test('executive center never presents partial required sources as a complete decision inbox', async () => {
  const page = await readFile(pageUrl, 'utf8');

  assert.match(page, /const executiveUnavailable=Boolean\(error\)/);
  assert.match(page, /value=\{unavailable\?'—':n\(active\.length\)\}/);
  assert.match(page, /Fuente incompleta/);
  assert.match(page, /Bandeja ejecutiva no disponible/);
  assert.match(page, /No se muestran decisiones parciales ni se afirma que no existan críticas/);
  assert.match(page, /!executiveUnavailable&&productionHealth/);
});
