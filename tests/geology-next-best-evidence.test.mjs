import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const builderUrl = new URL('../lib/geology-ai/next-best-evidence.ts', import.meta.url);
const routeUrl = new URL('../app/api/produccion/geologia/next-best-evidence/route.ts', import.meta.url);
const workspaceUrl = new URL('../components/production/geologia-next-best-evidence.tsx', import.meta.url);
const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);

test('next best evidence ranks unresolved evidence without inventing geological probability', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /buildInterpretationMatrix/);
  assert.match(builder, /Collar XY|collar xy/i);
  assert.match(builder, /survey/i);
  assert.match(builder, /ensaye/i);
  assert.match(builder, /not geological probability|no es probabilidad geológica/i);
  assert.doesNotMatch(builder, /resource estimate|resource_probability|ore_probability/i);
});

test('next best evidence API remains tenant and geology access scoped', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA\)/);
  assert.match(route, /organizationId: context\.organizationId/);
  assert.match(route, /buildNextBestEvidence/);
});

test('geology UI exposes evidence priority as review support, not a drilling recommendation', async () => {
  const [workspace, shell] = await Promise.all([readFile(workspaceUrl, 'utf8'), readFile(shellUrl, 'utf8')]);
  assert.match(shell, /\['priorities', 'Prioridades'\]/);
  assert.match(shell, /GeologiaNextBestEvidence/);
  assert.match(workspace, /Qué dato conviene recuperar primero/);
  assert.match(workspace, /No es probabilidad geológica, valor económico ni recomendación de perforación/);
  assert.match(workspace, /El geólogo decide/);
});
