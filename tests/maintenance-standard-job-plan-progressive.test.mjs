import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('app/api/maintenance/standard-job-plans/progressive/route.ts','utf8');
const page = fs.readFileSync('app/dashboard/mantenimiento/planes-estandar/progresivo/page.tsx','utf8');
const preventive = fs.readFileSync('app/dashboard/mantenimiento/preventivo-horas/page.tsx','utf8');

test('progressive standard plan API separates operations editing from managerial approval', () => {
  assert.match(api,/MANT_OPERACIONES/);
  assert.match(api,/action === 'approve' \? MODULE_KEYS\.MANT_GERENCIAL/);
  assert.match(api,/requireModuleAccess\(request, moduleKey, true\)/);
  assert.match(api,/eq\('organization_id', context\.organizationId\)/);
});

test('progressive plan never invents steps or materials', () => {
  assert.match(page,/Motil no propone pasos, controles ni repuestos por defecto/);
  assert.match(page,/Sólo agrega un repuesto cuando exista un producto canónico exacto/);
  assert.match(api,/Producto canónico no encontrado/);
});

test('progressive plan follows proposal steps materials approval sequence', () => {
  assert.match(page,/1\. Propuesta/);
  assert.match(page,/2\. Pasos/);
  assert.match(page,/3\. Repuestos/);
  assert.match(page,/4\. Aprobación/);
  assert.match(page,/Crear propuesta/);
  assert.match(page,/Agregar paso/);
  assert.match(page,/Agregar repuesto/);
  assert.match(page,/Aprobar plan/);
});

test('hour schedule links directly to its progressive standard plan', () => {
  assert.match(preventive,/planes-estandar\/progresivo\?scheduleId=/);
  assert.match(preventive,/Definir plan/);
});
