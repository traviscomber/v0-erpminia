import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/maintenance/decision-intelligence/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/mantenimiento/decision-intelligence/page.tsx', import.meta.url);

test('maintenance decision intelligence is authorized tenant scoped and reads backend canonical evidence', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(route, /getOrganizationContext\(request\)/);
  assert.match(route, /getSupabaseAdmin/);
  assert.match(route, /const db = getSupabaseAdmin\(\)/);
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
  assert.doesNotMatch(route, /context\.supabase\s*\n\s*\.from/);
  for (const source of ['drilling_maintenance_review_queue_v1','production_drilling_source_reports','preventive_maintenance_hour_status_v1','work_order_close_readiness_v2','maintenance_work_orders','maintenance_reliability_base_v1']) assert.match(route, new RegExp(source));
});

test('decision intelligence derives 90d operational patterns from lightweight canonical source reports', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /from\('production_drilling_source_reports'\)/);
  assert.match(route, /gte\('operation_date', windowStart\)/);
  assert.match(route, /limit\(5000\)/);
  assert.match(route, /const operationalMap = new Map/);
  assert.match(route, /derived_from_canonical_source_reports/);
  assert.doesNotMatch(route, /from\('drill_asset_operational_evidence_90d_v1'\)/);
});

test('maintenance decision intelligence reports the exact failing backend source without weakening access', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /maintenance_decision_intelligence_source_failed/);
  assert.match(route, /sourceErrors/);
  assert.match(route, /code: detail\?\.code \|\| null/);
  assert.match(route, /message: detail\?\.message \|\| null/);
  assert.doesNotMatch(route, /grant\s+select|security definer/i);
});

test('maintenance decision intelligence resolves closure asset identity from the canonical asset view', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /from\('maintenance_canonical_assets_v1'\)/);
  assert.match(route, /select\('id,asset_code,name'\)/);
  assert.match(route, /canonicalAssetMap/);
  assert.match(route, /asset_code: asset\?\.asset_code \|\| null/);
  assert.match(route, /asset_name: asset\?\.name \|\| null/);
  assert.doesNotMatch(route, /work_order_id,work_order_number,canonical_asset_id,asset_code,asset_name,title/);
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
  assert.match(page, /Cada caso separa hecho, interpretación, hipótesis, brecha de evidencia y próxima acción/);
  assert.match(page, /Checkpoint humano/);
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
  assert.match(page, /UAT, simulados o no operacionales fueron excluidos del aprendizaje/i);
});

test('observed 90 day degraded states remain reviewable patterns rather than diagnosed failures', async () => {
  const route = await readFile(routeUrl,'utf8');
  assert.match(route, /observed_condition_pattern/);
  assert.match(route, /repetición observable de estados degradados/i);
  assert.match(route, /no demuestra una tasa ni probabilidad de falla/i);
  assert.match(route, /causa mecánica vs\. operacional externa/i);
});
