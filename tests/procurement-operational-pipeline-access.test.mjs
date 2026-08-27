import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routePath = new URL('../app/api/procurement/operational-pipeline/route.ts', import.meta.url);

test('operational procurement pipeline requires compras read access', async () => {
  const source = await readFile(routePath, 'utf8');
  assert.match(source, /requireModuleAccess\(request, MODULE_KEYS\.FIN_COMPRAS\)/);
});

test('operational procurement mutations require compras edit access', async () => {
  const source = await readFile(routePath, 'utf8');
  assert.match(source, /requireModuleAccess\(request, MODULE_KEYS\.FIN_COMPRAS, true\)/);
  assert.match(source, /action === 'create_quotation'/);
  assert.match(source, /action === 'award_quotation'/);
  assert.match(source, /action === 'receive_order'/);
});
