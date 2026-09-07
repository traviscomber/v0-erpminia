import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const inventoryLegacy = new URL('../app/dashboard/inventario/page.tsx', import.meta.url);
const peopleLegacy = new URL('../app/dashboard/personas/page.tsx', import.meta.url);
const rrhhLayout = new URL('../app/dashboard/rrhh/layout.tsx', import.meta.url);
const rrhhOperational = new URL('../app/dashboard/rrhh/operacion/page.tsx', import.meta.url);

test('legacy inventory route resolves into the canonical Bodega domain', async () => {
  const source = await readFile(inventoryLegacy, 'utf8');
  assert.match(source, /redirect\('\/dashboard\/bodega'\)/);
});

test('legacy Personas route resolves into RRHH operational evidence', async () => {
  const source = await readFile(peopleLegacy, 'utf8');
  assert.match(source, /redirect\('\/dashboard\/rrhh\/operacion'\)/);
});

test('RRHH separates canonical people identity from operational capacity without inventing a workflow', async () => {
  const layout = await readFile(rrhhLayout, 'utf8');
  const operational = await readFile(rrhhOperational, 'utf8');

  assert.match(layout, /label: 'Personas'/);
  assert.match(layout, /label: 'Capacidad operacional'/);
  assert.doesNotMatch(layout, /step:/);
  assert.match(operational, /Evidencia que conecta personas con OT, activos, competencias, credenciales y EPP/);
  assert.match(operational, /no reemplaza la identidad laboral canónica de RRHH/i);
});
