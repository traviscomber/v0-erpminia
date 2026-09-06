import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const builderUrl = new URL('../lib/geology-ai/evidence-recovery-worklist.ts', import.meta.url);
const routeUrl = new URL('../app/api/produccion/geologia/evidence-recovery-worklist/route.ts', import.meta.url);
const componentUrl = new URL('../components/production/geologia-evidence-recovery-worklist.tsx', import.meta.url);
const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);

test('recovery worklist is read-only and uses explicit canonical/history sources', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /production_geology_topography_recovery_v1/);
  assert.match(builder, /production_geology_survey_recovery_v1/);
  assert.match(builder, /production_geology_hole_context_v2/);
  assert.match(builder, /production_drill_intervals/);
  assert.match(builder, /production_chemistry_lineage_v1/);
  assert.doesNotMatch(builder, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});

test('recovery worklist never promotes narrative evidence to canonical geology', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /no autoriza a derivar XY\/CRS desde narrativa/i);
  assert.match(builder, /estaciones numéricas depth\/azimuth\/dip/i);
  assert.match(builder, /No son logging geológico formal/i);
  assert.match(builder, /No crear logging formal desde observaciones operacionales/i);
  assert.match(builder, /mantener la brecha explícita/i);
  assert.match(builder, /no equivale a una medición orientada/i);
  assert.match(builder, /no existe todavía evidencia suficiente para atribuir la muestra/i);
});

test('logging recovery excludes holes already backed by explicit formal logging', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /classifyIntervalEvidence/);
  assert.match(builder, /explicit_formal_logging/);
  assert.match(builder, /formalLoggingHoleIds/);
  assert.match(builder, /!formalLoggingHoleIds\.has/);
});

test('recovery worklist API is tenant scoped and category allowlisted', async () => {
  const route = await readFile(routeUrl, 'utf8');
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA\)/);
  assert.match(route, /organizationId: context\.organizationId/);
  assert.match(route, /parseRecoveryCategory/);
  assert.match(builder, /ALLOWED_CATEGORIES/);
});

test('geology priorities support reproducible deep-linked reviews', async () => {
  const component = await readFile(componentUrl, 'utf8');
  const shell = await readFile(shellUrl, 'utf8');
  assert.match(shell, /URLSearchParams\(window\.location\.search\)\.get\('tab'\)/);
  assert.match(shell, /GeologiaEvidenceRecoveryWorklist/);
  assert.match(component, /params\.get\('recovery'\)/);
  assert.match(component, /params\.get\('hole'\)/);
  assert.match(component, /tab=priorities&recovery=/);
  assert.match(component, /Logging fuente/);
  assert.match(component, /Abrir revisión enlazada/);
});
