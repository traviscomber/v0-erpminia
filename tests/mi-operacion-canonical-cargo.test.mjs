import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/mi-operacion/page.tsx', import.meta.url);
const configUrl = new URL('../lib/executive-portal-config.ts', import.meta.url);

test('operations manager resolves production portal by canonical cargo', async () => {
  const config = await readFile(configUrl, 'utf8');
  assert.match(config, /allowedCargos: \['JEFE PLANTA', 'GERENTE OPERACIONES'\]/);
});

test('Mi operacion derives identity from canonical portal data', async () => {
  const page = await readFile(pageUrl, 'utf8');
  assert.match(page, /\/api\/mi-area/);
  assert.match(page, /data\.user\.name/);
  assert.doesNotMatch(page, /Pedro Pablo Zegers/);
  assert.doesNotMatch(page, /gerente_operaciones/);
  assert.doesNotMatch(page, /\/api\/mi-operacion'/);
});
