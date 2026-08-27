import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/maintenance/work-orders/[id]/route.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/dashboard/mantenimiento/ordenes-trabajo/[id]/page.tsx', import.meta.url), 'utf8');

test('work order mutations require maintenance edit access', () => {
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES, true\)/);
});

test('cost center assignment is tenant scoped and validates active center', () => {
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /Centro de costo no válido para esta organización/);
  assert.match(route, /centro de costo seleccionado no está activo/i);
});

test('work order detail exposes finance assignment state', () => {
  assert.match(page, /Imputación financiera/);
  assert.match(page, /Compras no podrá adjudicar una OC asociada a esta OT/);
  assert.match(page, /cost_center_id/);
});
