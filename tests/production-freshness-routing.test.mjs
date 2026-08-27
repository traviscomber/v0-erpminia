import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const inbox = fs.readFileSync('app/api/actions/inbox/route.ts', 'utf8');
const workspace = fs.readFileSync('app/dashboard/produccion/actualizar-fuentes/page.tsx', 'utf8');

test('stale production data health opens the production source workspace', () => {
  assert.match(inbox, /rawId === 'production' && rest\[0\] === 'freshness'/);
  assert.match(inbox, /\/dashboard\/produccion\/actualizar-fuentes/);
});

test('production freshness workspace separates master sources from drilling', () => {
  assert.match(workspace, /Transporte y Planta comparten el master canónico/);
  assert.match(workspace, /\/dashboard\/produccion\/importacion-maestra/);
  assert.match(workspace, /\/dashboard\/produccion\/sondaje\/produccion/);
  assert.match(workspace, /Abrir un módulo no modifica la fecha de la fuente/);
});
