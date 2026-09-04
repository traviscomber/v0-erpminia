import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const providerUrl=new URL('../components/dashboard/dashboard-period-provider.tsx',import.meta.url);
const shellUrl=new URL('../components/layout/dashboard-shell.tsx',import.meta.url);
const periodApiUrl=new URL('../lib/api/dashboard-period.ts',import.meta.url);
const geologyApiUrl=new URL('../app/api/produccion/geologia/route.ts',import.meta.url);
const geologyDashboardUrl=new URL('../components/production/geologia-dashboard.tsx',import.meta.url);

test('dashboard exposes optional historical month selection through the URL',async()=>{
  const [provider,shell,helper]=await Promise.all([readFile(providerUrl,'utf8'),readFile(shellUrl,'utf8'),readFile(periodApiUrl,'utf8')]);
  assert.match(shell,/DashboardPeriodProvider/);
  assert.match(provider,/Todo el histórico/);
  assert.match(provider,/params\.set\('month',next\)/);
  assert.match(helper,/^\s*if\(!month\)return \{month:null,start:null,end:null\};/m);
  assert.match(helper,/\.gte\(column,period\.start\)\.lt\(column,period\.end\)/);
});

test('geology month filters operational drilling evidence while canonical geology remains available',async()=>{
  const [api,dashboard]=await Promise.all([readFile(geologyApiUrl,'utf8'),readFile(geologyDashboardUrl,'utf8')]);
  assert.match(api,/applyDatePeriod[\s\S]*production_drilling_source_reports[\s\S]*operation_date/);
  assert.match(api,/period:\s*period\.month\s*\|\|\s*'all'/);
  assert.match(api,/production_drill_holes/);
  assert.match(api,/production_drill_intervals/);
  assert.match(api,/production_chemistry_samples/);
  assert.match(dashboard,/periodUrl\('\/api\/produccion\/geologia',month\)/);
  assert.match(dashboard,/sortedDrilling/);
  assert.match(dashboard,/ArrowUpDown/);
  assert.match(dashboard,/filteredHoles/);
});
