import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/maintenance/senior-assistant/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/mantenimiento/page.tsx', import.meta.url);
const componentUrl = new URL('../components/maintenance/maintenance-senior-assistant.tsx', import.meta.url);

test('maintenance senior assistant is authorized and tenant scoped', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
  for (const source of ['maintenance_canonical_assets_v1','drilling_maintenance_review_queue_v1','drill_asset_operational_evidence_90d_v1','preventive_maintenance_hour_status_v1','maintenance_work_orders','maintenance_reliability_base_v1','work_order_close_readiness_v2']) assert.match(route, new RegExp(source));
});

test('assistant excludes synthetic UAT evidence from reliability learning', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /isSynthetic/);
  assert.match(route, /audited_non_synthetic_reliability/);
  assert.match(route, /No uses UAT, simulaciones o pruebas como evidencia de confiabilidad real/);
});

test('assistant keeps operational frequency separate from failure probability and human authority', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /NO es probabilidad de falla/);
  assert.match(route, /no crea ni cierra OT/i);
  assert.match(route, /DATO CANÓNICO, INTERPRETACIÓN PROFESIONAL, HIPÓTESIS A REVISAR/);
});

test('maintenance control center exposes the senior assistant', async () => {
  const [page, component] = await Promise.all([readFile(pageUrl, 'utf8'), readFile(componentUrl, 'utf8')]);
  assert.match(page, /MaintenanceSeniorAssistant/);
  assert.match(page, /Decision Intelligence/);
  assert.match(component, /\/api\/maintenance\/senior-assistant/);
  assert.match(component, /Próxima mejor evidencia/);
});
