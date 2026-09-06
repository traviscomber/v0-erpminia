import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/maintenance/data-readiness/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/mantenimiento/data-readiness/page.tsx', import.meta.url);
const layoutUrl = new URL('../app/dashboard/mantenimiento/layout.tsx', import.meta.url);

test('maintenance readiness is tenant scoped and reads the canonical asset view', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(route, /from\('canonical_assets_current'\)/);
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
});

test('maintenance readiness preserves missing data as missing instead of inferring it', async () => {
  const [route, page] = await Promise.all([readFile(routeUrl, 'utf8'), readFile(pageUrl, 'utf8')]);
  assert.match(route, /Un campo vacío no autoriza a MOTIL a inferirlo automáticamente/);
  assert.match(route, /requieren evidencia o validación humana/);
  assert.match(page, /No son datos estimables/);
  assert.match(page, /Frontera de confianza/);
});

test('maintenance readiness treats type criticality and operational status as essential', async () => {
  const route = await readFile(routeUrl, 'utf8');
  for (const field of ['asset_type', 'criticality', 'operational_status']) assert.match(route, new RegExp(field));
  assert.match(route, /needs_validation/);
  assert.match(route, /canonical_assets_current/);
});

test('maintenance readiness stays inside the canonical Assets context', async () => {
  const [page, layout] = await Promise.all([readFile(pageUrl, 'utf8'), readFile(layoutUrl, 'utf8')]);
  assert.match(page, /\/dashboard\/mantenimiento\/equipos\/\$\{row\.id\}\/ficha/);
  assert.match(layout, /\/dashboard\/mantenimiento\/data-readiness/);
});
