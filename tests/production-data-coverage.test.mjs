import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const overviewApiUrl = new URL('../app/api/produccion/canonical-overview/route.ts', import.meta.url);
const dashboardUrl = new URL('../components/dashboard/produccion-dashboard.tsx', import.meta.url);
const productionLayoutUrl = new URL('../app/dashboard/produccion/layout.tsx', import.meta.url);
const coverageMigrationUrl = new URL('../supabase/migrations/20260824040000_consolidate_production_overview_counts.sql', import.meta.url);

test('production overview derives coverage from one exact service-role summary', async () => {
  const [api, migration] = await Promise.all([
    readFile(overviewApiUrl, 'utf8'),
    readFile(coverageMigrationUrl, 'utf8'),
  ]);

  assert.match(api, /rpc\('production_data_coverage_summary_v1'/);
  assert.match(migration, /production_import_exceptions[\s\S]*review_status = 'pending'/);
  assert.match(migration, /production_drill_hole_location_review_queue_v1[\s\S]*resolution_state = 'needs_evidence'/);
  assert.match(migration, /production_chemistry_results/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /revoke execute[\s\S]*from public/);
  assert.match(migration, /grant execute[\s\S]*to service_role/);
  assert.doesNotMatch(api, /count: 'exact', head: true/);
  assert.doesNotMatch(
    api,
    /production_normalization_exceptions_v1'[\s\S]*select\('domain,exception_type'\)/,
    'the overview must not count a paginated exception list as if it were complete',
  );
  assert.match(api, /drillingReports: num\(drillingSummary\?\.report_rows\)/);
  assert.match(api, /drillingHoles: num\(drillingSummary\?\.holes\)/);
});

test('production dashboard prioritizes KPIs and keeps every desktop tab visible', async () => {
  const [dashboard, layout] = await Promise.all([
    readFile(dashboardUrl, 'utf8'),
    readFile(productionLayoutUrl, 'utf8'),
  ]);

  const kpiPosition = dashboard.indexOf('label="Tratado"');
  const planPosition = dashboard.indexOf('Plan vs ejecución');
  const intelligencePosition = dashboard.indexOf('Inteligencia operacional');
  const coveragePosition = dashboard.indexOf('<CoverageOverview data={data}/>');

  assert.ok(
    kpiPosition >= 0 && planPosition > kpiPosition && intelligencePosition > planPosition && coveragePosition > intelligencePosition,
    'the executive sequence must be KPI, plan, intelligence, then detailed coverage',
  );
  assert.match(dashboard, /sm:grid-cols-2 lg:grid-cols-3/);
  assert.doesNotMatch(dashboard, /grid-cols-[56]/, 'operational data groups must not exceed three columns');
  assert.match(layout, /overflow-x-auto[^"]*lg:grid[^"]*lg:grid-cols-4[^"]*lg:overflow-visible/);
  assert.match(layout, /lg:w-full lg:justify-center/);
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
