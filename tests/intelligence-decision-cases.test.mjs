import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL('../supabase/migrations/20260908152500_add_motil_ai_decision_cases.sql', import.meta.url);
const accessUrl = new URL('../lib/intelligence/decision-case-access.ts', import.meta.url);
const routeUrl = new URL('../app/api/intelligence/decision-cases/route.ts', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('Decision Cases are explicitly advisory and separate from canonical operational decisions', async () => {
  const migration = await read(migrationUrl);
  assert.match(migration, /motil_ai_decision_cases/);
  assert.match(migration, /authority text not null default 'advisory_only'/);
  assert.match(migration, /Never an approval, work order, purchase decision, alert acknowledgement/);
  assert.match(migration, /enable row level security/);
  assert.doesNotMatch(migration, /procurement_award_decisions/);
  assert.doesNotMatch(migration, /maintenance_asset_lifecycle_decisions/);
  assert.doesNotMatch(migration, /corrective_actions/);
});

test('handoff validates current access to source and target specialist domains', async () => {
  const [access, route] = await Promise.all([read(accessUrl), read(routeUrl)]);
  assert.match(access, /requireModuleAccess/);
  assert.match(access, /resolveExecutiveAccess/);
  assert.match(access, /resolveDocumentAccess/);
  assert.match(access, /resolveDataHealthAccess/);
  assert.match(access, /MANT_OPERACIONES/);
  assert.match(access, /PROD_GEOLOGIA/);
  assert.match(route, /canAccessDecisionCaseDomain\(request, message\.domain\)/);
  assert.match(route, /canAccessDecisionCaseDomain\(request, targetDomain\)/);
  assert.match(route, /No tienes permisos actuales para el origen o destino del handoff/);
});

test('case provenance comes from the persisted assistant message and not from client evidence', async () => {
  const route = await read(routeUrl);
  assert.match(route, /\.from\('motil_ai_messages'\)/);
  assert.match(route, /\.eq\('role', 'assistant'\)/);
  assert.match(route, /const evidenceRefs = Array\.isArray\(message\.source_refs\) \? message\.source_refs : \[\]/);
  assert.match(route, /El mensaje fuente no contiene evidencia persistida/);
  assert.match(route, /evidence_refs: evidenceRefs/);
  assert.doesNotMatch(route, /evidence_refs:\s*body/);
  assert.doesNotMatch(route, /body\?\.evidenceRefs/);
});

test('human workflow linkage is read-only and must match the current role task worklist', async () => {
  const route = await read(routeUrl);
  assert.match(route, /role_tasks_actionable_v1/);
  assert.match(route, /\.eq\('organization_id', organizationId\)/);
  assert.match(route, /\.eq\('cargo_id', profile\.cargo_id\)/);
  assert.match(route, /workflow\?\.task_key/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.doesNotMatch(route, /role_tasks_actionable_v1[\s\S]{0,250}\.update\(/);
  assert.doesNotMatch(route, /role_tasks_actionable_v1[\s\S]{0,250}\.insert\(/);
});

test('case listing hides advisory content when source or target access has been revoked', async () => {
  const route = await read(routeUrl);
  assert.match(route, /filterAccessibleDecisionCaseDomains/);
  assert.match(route, /accessible\.has\(row\.source_domain\) && accessible\.has\(row\.target_domain\)/);
  assert.match(route, /hiddenByCurrentPermissions/);
});

test('acknowledge and archive only mutate advisory case metadata', async () => {
  const route = await read(routeUrl);
  assert.match(route, /action === 'acknowledge' \|\| action === 'archive'/);
  assert.match(route, /\.from\('motil_ai_decision_cases'\)/);
  assert.match(route, /acknowledged_by_user_id/);
  assert.doesNotMatch(route, /\.from\('maintenance_work_orders'\)/);
  assert.doesNotMatch(route, /\.from\('canonical_purchase_orders_current'\)/);
  assert.doesNotMatch(route, /\.from\('procurement_award_decisions'\)/);
});
