import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboardUrl = new URL('../app/dashboard/page.tsx', import.meta.url);

test('dashboard areas expose direct links to their granular capabilities', async () => {
  const dashboard = await readFile(dashboardUrl, 'utf8');

  for (const [label, href] of [
    ['Stock', '/dashboard/bodega'],
    ['Órdenes de trabajo', '/dashboard/mantenimiento/ordenes-trabajo'],
    ['Transporte de Mineral', '/dashboard/produccion/transporte-mineral'],
    ['Proveedores', '/dashboard/compras/proveedores-360'],
    ['Centros de costo', '/dashboard/finanzas/centros'],
    ['Desempeño', '/dashboard/desempeno'],
    ['Medio ambiente', '/dashboard/sostenibilidad/medio-ambiente'],
    ['Permisos', '/dashboard/legal/permisos-licencias'],
  ]) {
    assert.match(dashboard, new RegExp(`\\['${label}', '${href.replaceAll('/', '\\/')}'\\]`));
  }

  assert.match(dashboard, /item\.capabilities\.map/);
  assert.match(dashboard, /aria-label=\{`Accesos de \$\{item\.title\}`\}/);
});
