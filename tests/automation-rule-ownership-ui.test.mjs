import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiUrl = new URL('../app/api/automations/rules/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/automatizaciones/page.tsx', import.meta.url);

test('automation rules expose edit ownership without weakening server enforcement', async () => {
  const api = await readFile(apiUrl, 'utf8');

  assert.match(api, /can_edit: rule\.created_by === context\.userId/);
  assert.match(api, /\.eq\('created_by', context\.userId\)/);
  assert.match(api, /La regla no pertenece al usuario actual o ya no existe/);
});

test('automation UI keeps foreign rules read-only and surfaces mutation failures', async () => {
  const page = await readFile(pageUrl, 'utf8');

  assert.match(page, /can_edit: boolean/);
  assert.match(page, /Sólo lectura/);
  assert.match(page, /Creada por otro usuario/);
  assert.match(page, /if \(!response\.ok\)/);
  assert.match(page, /setFeedback\(\{ ok: false/);
  assert.match(page, /AlertTriangle/);
});
