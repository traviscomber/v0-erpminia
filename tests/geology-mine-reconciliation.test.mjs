import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const apiUrl = new URL('../app/api/produccion/geologia/route.ts', import.meta.url);
const dashboardUrl = new URL('../components/production/geologia-dashboard.tsx', import.meta.url);

test('geology mine assignment requires write access and remains organization scoped', async () => {
  const api = await readFile(apiUrl, 'utf8');
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA, true\)/);
  assert.match(api, /production_drilling_source_reports'[\s\S]*eq\('organization_id',context\.organizationId\)[\s\S]*eq\('id',reportId\)/);
  assert.match(api, /production_mine_sources'[\s\S]*eq\('organization_id',context\.organizationId\)[\s\S]*eq\('id',mineId\)/);
  assert.match(api, /Sector y pozo no se infieren/);
});

test('geology dashboard lets editors assign a canonical mine', async () => {
  const dashboard = await readFile(dashboardUrl, 'utf8');
  assert.match(dashboard, /data\.canWrite/);
  assert.match(dashboard, /Seleccionar mina/);
  assert.match(dashboard, /JSON\.stringify\(\{reportId,mineId\}\)/);
  assert.match(dashboard, /r\.mine_raw !== '#ERROR!'/);
});
