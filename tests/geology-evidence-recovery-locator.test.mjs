import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const builderUrl = new URL('../lib/geology-ai/evidence-recovery-locator.ts', import.meta.url);
const routeUrl = new URL('../app/api/produccion/geologia/evidence-recovery-locator/route.ts', import.meta.url);
const componentUrl = new URL('../components/production/geologia-evidence-recovery-sources.tsx', import.meta.url);
const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);

test('recovery locator reads existing canonical and historical evidence sources without writes', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /production_geology_topography_recovery_v1/);
  assert.match(builder, /production_geology_survey_recovery_v1/);
  assert.match(builder, /production_geology_hole_context_v2/);
  assert.match(builder, /production_chemistry_lineage_v1/);
  assert.doesNotMatch(builder, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});

test('recovery locator preserves geology trust boundaries and chemistry lineage gap', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /No convertir texto narrativo en coordenadas/);
  assert.match(builder, /no reemplaza estaciones numéricas depth\/azimuth\/dip/);
  assert.match(builder, /Sirven para localizar filas fuente, no para inventar logging/);
  assert.match(builder, /no equivalen a orientación estructural medida/);
  assert.match(builder, /No puede presentarse como ensaye de un sondaje específico/);
  assert.match(builder, /No inferirla sólo por sector, fecha o similitud de código/);
});

test('recovery locator API stays tenant and geology-module scoped', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA\)/);
  assert.match(route, /organizationId: context\.organizationId/);
});

test('priorities workspace distinguishes located sources, historical clues and lineage gaps', async () => {
  const component = await readFile(componentUrl, 'utf8');
  const shell = await readFile(shellUrl, 'utf8');
  assert.match(component, /Fuente localizada/);
  assert.match(component, /Pista histórica/);
  assert.match(component, /Brecha de linaje/);
  assert.match(component, /química sin vínculo explícito muestra → sondaje → intervalo/i);
  assert.match(shell, /GeologiaEvidenceRecoverySources/);
});
