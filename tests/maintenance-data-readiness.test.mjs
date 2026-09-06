import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/maintenance/data-readiness/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/mantenimiento/data-readiness/page.tsx', import.meta.url);

test('maintenance data readiness is tenant scoped and reads canonical assets', async () => {
  const route = await readFile(routeUrl,'utf8');
  assert.match(route,/requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(route,/from\('canonical_assets_current'\)/);
  assert.match(route,/eq\('organization_id', context\.organizationId\)/);
});

test('maintenance data readiness does not infer missing canonical fields', async () => {
  const [route,page]=await Promise.all([readFile(routeUrl,'utf8'),readFile(pageUrl,'utf8')]);
  assert.match(route,/Un campo vacío no autoriza a MOTIL a inferirlo automáticamente/);
  assert.match(route,/deben ser validados por una persona responsable/);
  assert.match(page,/requieren evidencia o validación responsable/);
});

test('maintenance data readiness exposes essential gaps explicitly', async () => {
  const route=await readFile(routeUrl,'utf8');
  for (const field of ['Tipo de activo','Criticidad','Estado operacional']) assert.match(route,new RegExp(field));
  assert.match(route,/needs_validation/);
});
