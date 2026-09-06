import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const builderUrl = new URL('../lib/geology-ai/evidence-recovery-campaign.ts', import.meta.url);
const routeUrl = new URL('../app/api/produccion/geologia/evidence-recovery-campaign/route.ts', import.meta.url);
const componentUrl = new URL('../components/production/geologia-evidence-recovery-campaign.tsx', import.meta.url);
const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);

test('recovery campaign remains read-only and canonical-source scoped', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /production_geology_topography_recovery_v1/);
  assert.match(builder, /production_geology_survey_recovery_v1/);
  assert.match(builder, /production_geology_hole_context_v2/);
  assert.match(builder, /production_geology_data_quality_v1/);
  assert.doesNotMatch(builder, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});

test('recovery campaign never turns documentary priority into geological probability', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /No representa probabilidad geológica/i);
  assert.match(builder, /archivo o exportación numérica original/i);
  assert.match(builder, /validación humana antes de materializarse/i);
});

test('recovery campaign ranks recent evidence explicitly inside source class', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  const component = await readFile(componentUrl, 'utf8');
  assert.match(builder, /last_evidence_date[\s\S]*localeCompare/);
  assert.match(component, /pista más reciente/);
});

test('recovery campaign API is geology-authorized and tenant scoped', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA\)/);
  assert.match(route, /organizationId: context\.organizationId/);
});

test('recovery campaign remains an optional utility rather than a primary request for missing data', async () => {
  const component = await readFile(componentUrl, 'utf8');
  const shell = await readFile(shellUrl, 'utf8');
  assert.match(component, /recovery=collar_geometry/);
  assert.match(component, /recovery=drill_orientation/);
  assert.doesNotMatch(shell, /GeologiaEvidenceRecoveryCampaign/);
});
