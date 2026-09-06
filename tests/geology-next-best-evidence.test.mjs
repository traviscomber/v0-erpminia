import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const builderUrl = new URL('../lib/geology-ai/next-best-evidence.ts', import.meta.url);
const routeUrl = new URL('../app/api/produccion/geologia/next-best-evidence/route.ts', import.meta.url);
const workspaceUrl = new URL('../components/production/geologia-next-best-evidence.tsx', import.meta.url);
const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);

test('next best evidence ranks recovery work without geological pseudo scoring', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /foundation > validation > support/);
  assert.match(builder, /affected_patterns/);
  assert.match(builder, /affected_holes/);
  assert.match(builder, /No representa probabilidad geológica/i);
  assert.doesNotMatch(builder, /patternWeight|evidenceWeight|score:/);
});

test('foundation evidence stays ahead of interpretation validation evidence', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /collar xy/);
  assert.match(builder, /crs/);
  assert.match(builder, /orientación completa/);
  assert.match(builder, /survey downhole/);
  assert.match(builder, /logging/);
  assert.match(builder, /ensaye/);
});

test('next best evidence API remains tenant and geology access scoped', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA\)/);
  assert.match(route, /organizationId: context\.organizationId/);
  assert.match(route, /getOrganizationContext/);
});

test('workspace explains authority boundary and human checkpoint', async () => {
  const workspace = await readFile(workspaceUrl, 'utf8');
  const shell = await readFile(shellUrl, 'utf8');
  assert.match(workspace, /No es probabilidad geológica, ley, valor económico ni recomendación de perforación/i);
  assert.match(workspace, /El geólogo decide/);
  assert.match(workspace, /Fundacional/);
  assert.match(shell, /\['priorities', 'Prioridades'\]/);
  assert.match(shell, /GeologiaNextBestEvidence/);
});
