import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const inventoryLegacy = new URL('../app/dashboard/inventario/page.tsx', import.meta.url);
const peopleLegacy = new URL('../app/dashboard/personas/page.tsx', import.meta.url);
const rolesLegacy = new URL('../app/dashboard/roles/page.tsx', import.meta.url);
const operationalAiLegacy = new URL('../app/dashboard/ia-operacional/page.tsx', import.meta.url);
const kpiDashboardLegacy = new URL('../app/dashboard/kpi-dashboard/page.tsx', import.meta.url);
const rrhhLayout = new URL('../app/dashboard/rrhh/layout.tsx', import.meta.url);
const rrhhOperational = new URL('../app/dashboard/rrhh/operacion/page.tsx', import.meta.url);
const sidebar = new URL('../components/layout/sidebar.tsx', import.meta.url);

test('legacy inventory route resolves into the canonical Bodega domain', async () => {
  const source = await readFile(inventoryLegacy, 'utf8');
  assert.match(source, /redirect\('\/dashboard\/bodega'\)/);
});

test('global navigation names Bodega as the canonical inventory area', async () => {
  const source = await readFile(sidebar, 'utf8');
  assert.match(source, /label:'Bodega',href:'\/dashboard\/bodega'/);
  assert.doesNotMatch(source, /label:'Inventario',href:'\/dashboard\/bodega'/);
});

test('legacy Personas route resolves into RRHH operational evidence', async () => {
  const source = await readFile(peopleLegacy, 'utf8');
  assert.match(source, /redirect\('\/dashboard\/rrhh\/operacion'\)/);
});

test('legacy roles matrix resolves into canonical protected role administration', async () => {
  const source = await readFile(rolesLegacy, 'utf8');
  assert.match(source, /redirect\('\/dashboard\/admin\/roles'\)/);
  assert.doesNotMatch(source, /ROLE_PERMISSIONS/);
});

test('legacy operational AI executive page resolves into the canonical decision center', async () => {
  const source = await readFile(operationalAiLegacy, 'utf8');
  assert.match(source, /redirect\('\/dashboard\/decisiones'\)/);
  assert.doesNotMatch(source, /api\/dashboard\/ia-operacional/);
});

test('legacy hard-coded KPI dashboard resolves into traceable operational performance', async () => {
  const source = await readFile(kpiDashboardLegacy, 'utf8');
  assert.match(source, /redirect\('\/dashboard\/desempeno'\)/);
  assert.doesNotMatch(source, /trend:/);
  assert.doesNotMatch(source, /change:/);
  assert.doesNotMatch(source, /api\/dashboard\/kpi-dashboard/);
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
