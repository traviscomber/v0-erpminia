import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const controlUrl = new URL('../app/api/maintenance/control-center/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/mantenimiento/preventivo-horas/page.tsx', import.meta.url);

test('control center groups only overdue unplanned schedules sharing asset due meter and frequency', async () => {
  const source = await readFile(controlUrl, 'utf8');
  assert.match(source, /preventiveGroupKey/);
  assert.match(source, /row\.canonical_asset_id \|\| row\.asset_code/);
  assert.match(source, /row\.due_meter/);
  assert.match(source, /row\.frequency_hours/);
  assert.match(source, /row\.hour_status === 'overdue' && !row\.generated_work_order_id/);
  assert.match(source, /unplannedOverdueInterventionGroups: overduePreventiveGroups\.size/);
});

test('preventive grouping preserves schedule and work-order independence', async () => {
  const [control, page] = await Promise.all([readFile(controlUrl, 'utf8'), readFile(pageUrl, 'utf8')]);
  assert.match(control, /agrupación operativa, pautas independientes/);
  assert.match(control, /Cada pauta conserva su identidad y su OT independiente/);
  assert.match(page, /cada pauta conserva su identidad, evidencia, procedimiento y OT independiente/);
  assert.match(page, /MOTIL no las fusiona automáticamente/);
  assert.doesNotMatch(control, /plan_due_hour_preventive_work_order_v1/);
});

test('control center deep-links a preventive coordination group to its exact asset and due meter', async () => {
  const source = await readFile(controlUrl, 'utf8');
  assert.match(source, /params\.set\('assetId'/);
  assert.match(source, /params\.set\('dueMeter'/);
  assert.match(source, /\/dashboard\/mantenimiento\/preventivo-horas\$\{query/);
});

test('preventive page filters a coordination view without changing canonical rows', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.match(source, /useSearchParams/);
  assert.match(source, /focusAssetId/);
  assert.match(source, /focusDueMeter/);
  assert.match(source, /Intervención coordinada/);
  assert.match(source, /La coordinación visual no altera el ciclo ni el estado de ninguna pauta/);
  assert.match(source, /planSchedule\(row\.schedule_id\)/);
});

test('preventive page respects the MOTIL compact KPI and header-action rules', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.match(source, /Pautas configuradas/);
  assert.match(source, /Activos configurados/);
  assert.match(source, /Vencidas/);
  assert.match(source, /Pendientes/);
  assert.doesNotMatch(source, /xl:grid-cols-5/);
  assert.match(source, /<PageHeaderActions>/);
});
