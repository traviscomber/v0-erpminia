import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const overviewApiUrl = new URL('../app/api/produccion/canonical-overview/route.ts', import.meta.url);
const dashboardUrl = new URL('../components/dashboard/produccion-dashboard.tsx', import.meta.url);

test('production overview derives coverage from exact server-side counts', async () => {
  const api = await readFile(overviewApiUrl, 'utf8');

  assert.match(api, /production_import_exceptions'[\s\S]*count: 'exact', head: true/);
  assert.match(api, /production_drill_hole_location_review_queue_v1'[\s\S]*count: 'exact', head: true/);
  assert.match(api, /production_chemistry_results'[\s\S]*count: 'exact', head: true/);
  assert.doesNotMatch(
    api,
    /production_normalization_exceptions_v1'[\s\S]*select\('domain,exception_type'\)/,
    'the overview must not count a paginated exception list as if it were complete',
  );
  assert.match(api, /drillingReports: num\(drillingSummary\?\.report_rows\)/);
  assert.match(api, /drillingHoles: num\(drillingSummary\?\.holes\)/);
});

test('production overview preserves semantic copy for both data and no-data responses', async () => {
  const api = await readFile(overviewApiUrl, 'utf8');
  const [noDataBranch, dataBranch] = api.split('const throughDate =');

  assert.match(api, /const semantics = \{[\s\S]*sourceAbsence: 'Ausencia de una fuente no equivale a valor cero\.'/);
  assert.match(noDataBranch, /currentPeriod: null,[\s\S]*daily: \[\],[\s\S]*semantics,/);
  assert.match(dataBranch, /intelligence,[\s\S]*semantics,[\s\S]*\}\);/);
});

test('production dashboard distinguishes operational, partial and missing-source areas', async () => {
  const dashboard = await readFile(dashboardUrl, 'utf8');

  assert.match(dashboard, /label:'Operativo'/);
  assert.match(dashboard, /label:'Parcial'/);
  assert.match(dashboard, /label:'Sin fuente'/);
  assert.match(dashboard, /Cobertura real por área/);
  assert.match(dashboard, /Sin fuente nunca se representa como cero/i);
  assert.doesNotMatch(dashboard, /Siguiente capa para evidencia analítica/);
});

test('production coverage exposes every technical area already present in navigation', async () => {
  const dashboard = await readFile(dashboardUrl, 'utf8');

  for (const route of [
    '/dashboard/produccion/transporte-mineral',
    '/dashboard/produccion/planta-metalurgia',
    '/dashboard/produccion/sondaje',
    '/dashboard/produccion/quimica',
    '/dashboard/produccion/geologia',
    '/dashboard/produccion/topografia',
  ]) {
    assert.match(dashboard, new RegExp(route.replaceAll('/', '\\/')));
  }
});
