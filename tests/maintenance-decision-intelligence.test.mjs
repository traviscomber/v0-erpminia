import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/maintenance/decision-intelligence/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/mantenimiento/decision-intelligence/page.tsx', import.meta.url);

test('maintenance decision intelligence is tenant scoped and reads canonical operational evidence', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
  for (const source of ['drilling_maintenance_review_queue_v1','drill_asset_operational_evidence_90d_v1','preventive_maintenance_hour_status_v1','work_order_close_readiness_v2','maintenance_work_orders','maintenance_reliability_base_v1']) assert.match(route, new RegExp(source));
});

test('maintenance decision intelligence separates fact interpretation hypothesis and human action', async () => {
  const [route,page] = await Promise.all([readFile(routeUrl,'utf8'),readFile(pageUrl,'utf8')]);
  assert.match(route, /canonical_fact/);
  assert.match(route, /professional_interpretation/);
  assert.match(route, /hypothesis_to_review/);
  assert.match(route, /evidence_for/);
  assert.match(route, /evidence_against/);
  assert.match(route, /missing_evidence/);
  assert.match(route, /human_checkpoint/);
  assert.match(page, /Dato canónico → interpretación profesional → hipótesis revisable → evidencia faltante → próxima acción → validación humana/);
});

test('maintenance priority is not represented as failure probability or autonomous decision', async () => {
  const [route,page] = await Promise.all([readFile(routeUrl,'utf8'),readFile(pageUrl,'utf8')]);
  assert.match(route, /no es probabilidad de falla ni decisión autónoma/i);
  assert.match(route, /patterns, not failure probabilities/i);
  assert.doesNotMatch(page, /probabilidad de falla[^\n]*%/i);
  assert.match(page, /Checkpoint humano/);
});

test('maintenance learning excludes UAT simulated and imported closures', async () => {
  const [route,page] = await Promise.all([readFile(routeUrl,'utf8'),readFile(pageUrl,'utf8')]);
  assert.match(route, /syntheticMarker/);
  assert.match(route, /\\buat\\b\|simulad\|prueba\|test controlado/i);
  assert.match(route, /\.not\('created_by', 'is', null\)/);
  assert.match(route, /reliabilityClosuresExcludedAsSyntheticOrNonOperational/);
  assert.match(page, /excluidos de aprendizaje por ser UAT\/simulados o no operacionales/i);
});

test('observed 90 day degraded states remain reviewable patterns rather than diagnosed failures', async () => {
  const route = await readFile(routeUrl,'utf8');
  assert.match(route, /observed_condition_pattern/);
  assert.match(route, /repetición observable de estados degradados/i);
  assert.match(route, /no demuestra una tasa ni probabilidad de falla/i);
  assert.match(route, /causa mecánica vs\. operacional externa/i);
});
