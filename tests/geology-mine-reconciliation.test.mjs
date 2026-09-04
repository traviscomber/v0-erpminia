import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const apiUrl = new URL('../app/api/produccion/geologia/route.ts', import.meta.url);
const historyApiUrl = new URL('../app/api/produccion/geologia/historia-la-patagua/route.ts', import.meta.url);
const dashboardUrl = new URL('../components/production/geologia-dashboard.tsx', import.meta.url);
const historyUrl = new URL('../components/production/geologia-historical-canonical.tsx', import.meta.url);
const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);
const pageUrl = new URL('../app/dashboard/produccion/geologia/page.tsx', import.meta.url);

test('geology mine assignment requires write access and remains organization scoped', async () => {
  const api = await readFile(apiUrl, 'utf8');
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA, true\)/);
  assert.match(api, /production_drilling_source_reports'[\s\S]*eq\('organization_id',\s*context\.organizationId\)[\s\S]*eq\('id',\s*reportId\)/);
  assert.match(api, /production_mine_sources'[\s\S]*eq\('organization_id',\s*context\.organizationId\)[\s\S]*eq\('id',\s*mineId\)/);
  assert.match(api, /Sector y pozo no se infieren/);
});

test('geology dashboard follows the La Patagua operating workflow', async () => {
  const [dashboard, shell, page] = await Promise.all([
    readFile(dashboardUrl, 'utf8'),
    readFile(shellUrl, 'utf8'),
    readFile(pageUrl, 'utf8'),
  ]);
  assert.match(dashboard, /data\.canWrite/);
  assert.match(dashboard, /Seleccionar mina/);
  assert.match(dashboard, /JSON\.stringify\(\{reportId,mineId\}\)/);
  assert.match(dashboard, /Motil no los infiere ni los inventa/);
  assert.match(shell, /Hoy/);
  assert.match(shell, /Mapa y sondajes/);
  assert.match(shell, /Resultados/);
  assert.match(shell, /Pendientes/);
  assert.match(shell, /Histórico/);
  assert.match(shell, /sticky top-0/);
  assert.match(shell, /Vistas principales de Geología/);
  assert.match(page, /GeologiaWorkspaceShell/);
});

test('geology exposes canonical historical assays without inventing drill-hole links', async () => {
  const [api, history] = await Promise.all([readFile(apiUrl, 'utf8'), readFile(historyUrl, 'utf8')]);
  assert.match(api, /production_chemistry_results/);
  assert.match(api, /production_chemistry_results'[\s\S]*eq\('organization_id',\s*context\.organizationId\)/);
  assert.match(api, /production_drilling_operational_summary_v1/);
  assert.match(api, /sampleById/);
  assert.match(api, /mineById/);
  assert.match(api, /drill_hole_id:\s*sample\?\.drill_hole_id\s*\|\|\s*null/);
  assert.match(api, /no se asignan a sondajes sin evidencia/);
  assert.match(history, /Histórico canónico de La Patagua/);
  assert.match(history, /vínculo canónico explícito/);
  assert.match(history, /Ensayes históricos/);
  assert.match(history, /no se adhieren a pozos por similitud o fecha/);
  assert.match(history, /Sólo datos La Patagua/);
});

test('La Patagua historical geology endpoint exposes validated current-first head grade, live drilling and mine plan', async () => {
  const [historyApi, history] = await Promise.all([readFile(historyApiUrl, 'utf8'), readFile(historyUrl, 'utf8')]);
  assert.match(historyApi, /production_metallurgy_automatic_v1/);
  assert.match(historyApi, /production_metallurgy_automatic_v1'[\s\S]*eq\('organization_id',\s*context\.organizationId\)/);
  assert.match(historyApi, /order\('operation_date', \{ ascending: false \}\)/);
  assert.match(historyApi, /chronology: 'newest_first'/);
  assert.match(historyApi, /production_monthly_plans/);
  assert.match(historyApi, /production_monthly_plan_lines/);
  assert.match(historyApi, /production_drilling_source_reports/);
  assert.match(historyApi, /source: 'production_drilling_source_reports'/);
  assert.match(historyApi, /validation_status/);
  assert.match(historyApi, /=== 'valid'/);
  assert.match(historyApi, /provenance: 'La Patagua'/);
  assert.match(history, /Ahora · 2026/);
  assert.match(history, /Plan minero vigente/);
  assert.match(history, /Ley cabeza · más reciente primero/);
  assert.match(history, /Ensayes · más reciente primero/);
  assert.match(history, /Calculado directamente desde la tabla canónica vigente/);
  assert.match(history, /La lectura siempre prioriza el dato más reciente/);
  assert.doesNotMatch(history, /SERNAGEOMIN/i);
});

test('La Patagua geology API does not expose external geology context to the client', async () => {
  const api = await readFile(apiUrl, 'utf8');
  assert.doesNotMatch(api, /externalContext:\s*contextRows/);
  assert.doesNotMatch(api, /contextQuality:\s*q/);
  assert.doesNotMatch(api, /sernageominRecords:\s*Number/);
});
