import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sidebar = fs.readFileSync(new URL('../components/layout/sidebar.tsx', import.meta.url), 'utf8');
const financeLayout = fs.readFileSync(new URL('../app/dashboard/finanzas/layout.tsx', import.meta.url), 'utf8');
const financeCostCenters = fs.readFileSync(new URL('../app/dashboard/finanzas/centros/page.tsx', import.meta.url), 'utf8');
const financeReports = fs.readFileSync(new URL('../app/dashboard/finanzas/reportes/page.tsx', import.meta.url), 'utf8');
const performancePage = fs.readFileSync(new URL('../app/dashboard/desempeno/page.tsx', import.meta.url), 'utf8');

test('transversal capabilities do not compete as global sidebar modules', () => {
  assert.doesNotMatch(sidebar, /group:'Transversal'/);
  assert.doesNotMatch(sidebar, /label:'Desempeño'.*group:/);
  assert.doesNotMatch(sidebar, /label:'Reportes'.*group:/);
  assert.doesNotMatch(sidebar, /label:'Centros de costos'.*group:/);
});

test('finance owns the primary navigation for reports and cost centers', () => {
  assert.match(financeLayout, /href: '\/dashboard\/finanzas\/centros'.*moduleKey: 'core_centros_costos'/);
  assert.match(financeLayout, /href: '\/dashboard\/finanzas\/reportes'.*moduleKey: 'fin_reportes'/);
  assert.match(financeLayout, /canView\(item\.moduleKey\)/);
  assert.match(financeCostCenters, /CostCentersPage/);
  assert.match(financeReports, /ReportesPage/);
});

test('performance remains available as a gerencial capability', () => {
  assert.match(performancePage, /Desempeño operacional/);
  assert.match(performancePage, /api\/desempeno\/scorecards/);
});
