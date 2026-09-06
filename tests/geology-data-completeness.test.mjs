import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiUrl = new URL('../app/api/produccion/geologia/completeness/route.ts', import.meta.url);
const panelUrl = new URL('../components/production/geologia-data-completeness.tsx', import.meta.url);
const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);

test('geology completeness API stays geology-authorized and tenant scoped', async () => {
  const api = await readFile(apiUrl, 'utf8');

  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA\)/);
  assert.match(api, /getOrganizationContext\(request\)/);
  assert.match(api, /production_geology_drill_hole_readiness_v1/);
  assert.match(api, /production_geology_data_quality_v1/);
  assert.match(api, /production_drill_holes/);
  assert.match(api, /\.eq\('organization_id', context\.organizationId\)/);
});

test('geology completeness separates canonical values from dimension-specific recovery evidence', async () => {
  const api = await readFile(apiUrl, 'utf8');

  assert.match(api, /const dipRecoverable = rows\.filter\([\s\S]*downhole_survey_rows[\s\S]*dip_deg == null/);
  assert.match(api, /const azimuthRecoverable = rows\.filter\([\s\S]*downhole_survey_rows[\s\S]*azimuth_deg == null/);
  assert.match(api, /const orientationRecoverable = rows\.filter\([\s\S]*downhole_survey_rows[\s\S]*azimuth_deg != null && row\.dip_deg != null/);
  assert.match(api, /topographyRecoverable:[\s\S]*explicit_topography_rows[\s\S]*collar_easting != null && row\.collar_northing != null/);
  assert.match(api, /validated: 'Dato materializado y utilizable en el registro canónico\.'/);
  assert.match(api, /absent: 'No se localizó evidencia suficiente en las fuentes actualmente cargadas\.'/);
});

test('normalized hole identities are review candidates rather than automatic physical-hole merges', async () => {
  const api = await readFile(apiUrl, 'utf8');
  const panel = await readFile(panelUrl, 'utf8');

  assert.match(api, /normalizedHoleCode/);
  assert.match(api, /duplicate: 'Candidato de identidad duplicada[\s\S]*reconciliación humana/);
  assert.match(api, /normalizedIdentityLowerBound: 'Cota tipográfica: no equivale a cantidad de sondajes físicos/);
  assert.match(panel, /Cota tras normalización/);
  assert.match(panel, /no equivale a sondajes físicos/);
  assert.match(panel, /Revisión humana antes de merge/);
});

test('geology workspace exposes coverage without hiding evidence gaps', async () => {
  const panel = await readFile(panelUrl, 'utf8');
  const shell = await readFile(shellUrl, 'utf8');

  assert.match(shell, /\['completeness', 'Cobertura'\]/);
  assert.match(shell, /<GeologiaDataCompleteness \/>/);
  assert.match(panel, /Qué falta realmente en Geología/);
  assert.match(panel, /Negro = validado\. Gris = evidencia fuente recuperable/);
  assert.match(panel, /Propósito geológico formal/);
  assert.match(panel, /No se infiere desde observaciones operacionales/);
  assert.match(panel, /filas con metraje negativo/);
  assert.match(panel, /intervalos fuera de profundidad final/);
});
