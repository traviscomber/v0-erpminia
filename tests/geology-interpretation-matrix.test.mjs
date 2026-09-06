import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const builderUrl = new URL('../lib/geology-ai/interpretation-matrix.ts', import.meta.url);
const routeUrl = new URL('../app/api/produccion/geologia/interpretation-matrix/route.ts', import.meta.url);
const workspaceUrl = new URL('../components/production/geologia-interpretation-matrix.tsx', import.meta.url);
const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);

test('interpretation matrix keeps local evidence and regional context as separate authority layers', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /production_geology_observed_patterns_v1/);
  assert.match(builder, /production_geology_external_context/);
  assert.match(builder, /regional_context_only: true/);
  assert.match(builder, /no_probability_uplift: true/);
  assert.match(builder, /compatible, no como confirmación/);
  assert.match(builder, /cannot prove|never promotes|no confirma/i);
});

test('matrix requires local evidence before structural control or continuity conclusions', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /Orientación local de la estructura/);
  assert.match(builder, /Ensayes vinculados al tramo/);
  assert.match(builder, /Survey downhole numérico/);
  assert.match(builder, /Collar XY validado/);
  assert.match(builder, /antes de evaluar control estructural/);
});

test('interpretation matrix API is tenant and geology-access scoped', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA\)/);
  assert.match(route, /organizationId: context\.organizationId/);
  assert.match(route, /buildInterpretationMatrix/);
});

test('geology UI exposes matrix as a review workflow rather than a geological truth score', async () => {
  const [workspace, shell] = await Promise.all([readFile(workspaceUrl, 'utf8'), readFile(shellUrl, 'utf8')]);
  assert.match(shell, /\['matrix', 'Matriz'\]/);
  assert.match(shell, /GeologiaInterpretationMatrix/);
  assert.match(workspace, /Qué observamos, qué podría significar y qué falta probar/);
  assert.match(workspace, /SERNAGEOMIN orienta preguntas/);
  assert.match(workspace, /nunca rellena datos locales ni confirma control, continuidad, ley o dominio/);
  assert.doesNotMatch(workspace, /probabilidad geológica/i);
});
