import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const apiUrl = new URL('../app/api/produccion/geologia/route.ts', import.meta.url);
const dashboardUrl = new URL('../components/production/geologia-dashboard.tsx', import.meta.url);

test('geology mine assignment requires write access and remains organization scoped', async () => {
  const api = await readFile(apiUrl, 'utf8');
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA, true\)/);
  assert.match(api, /production_drilling_source_reports'[\s\S]*eq\('organization_id',\s*context\.organizationId\)[\s\S]*eq\('id',\s*reportId\)/);
  assert.match(api, /production_mine_sources'[\s\S]*eq\('organization_id',\s*context\.organizationId\)[\s\S]*eq\('id',\s*mineId\)/);
  assert.match(api, /Sector y pozo no se infieren/);
});

test('geology dashboard keeps canonical reconciliation and exposes the operating workspace', async () => {
  const dashboard = await readFile(dashboardUrl, 'utf8');
  assert.match(dashboard, /data\.canWrite/);
  assert.match(dashboard, /Seleccionar mina/);
  assert.match(dashboard, /JSON\.stringify\(\{reportId,mineId\}\)/);
  assert.match(dashboard, /r\.mine_raw !== '#ERROR!'/);
  assert.match(dashboard, /Mapa/);
  assert.match(dashboard, /Logging/);
  assert.match(dashboard, /Muestras & QA\/QC/);
  assert.match(dashboard, /SERNAGEOMIN/);
  assert.match(dashboard, /No sustituye una capa cartográfica oficial/);
  assert.match(dashboard, /Motil no infiere litología, alteración ni mineralización/);
});

test('geology API exposes external context without turning it into canonical evidence', async () => {
  const api = await readFile(apiUrl, 'utf8');
  assert.match(api, /production_geology_external_context/);
  assert.match(api, /production_geology_external_context'[\s\S]*eq\('organization_id',\s*context\.organizationId\)/);
  assert.match(api, /contexto geológico auxiliar se mantiene separado/);
  assert.match(api, /no crea relaciones canónicas por inferencia/);
  assert.doesNotMatch(api, /from\('production_geology_external_context'\)[\s\S]{0,500}\.update\(/);
  assert.doesNotMatch(api, /from\('production_geology_external_context'\)[\s\S]{0,500}\.insert\(/);
});
