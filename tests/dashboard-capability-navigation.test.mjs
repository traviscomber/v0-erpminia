import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboardUrl = new URL('../app/dashboard/page.tsx', import.meta.url);

test('dashboard home exposes role-specific operational shortcuts', async () => {
  const dashboard = await readFile(dashboardUrl, 'utf8');

  for (const [label, href] of [
    ['Planta y metalurgia', '/dashboard/produccion/planta-metalurgia'],
    ['Órdenes de trabajo', '/dashboard/mantenimiento/ordenes-trabajo'],
    ['Disponibilidad', '/dashboard/mantenimiento/disponibilidad'],
    ['Sondaje', '/dashboard/produccion/sondaje'],
    ['Mis acciones', '/dashboard/acciones'],
    ['Producción', '/dashboard/produccion'],
  ]) {
    assert.match(dashboard, new RegExp(`label: '${label}'.*href: '${href.replaceAll('/', '\\/')}'`));
  }

  assert.match(dashboard, /resolveMode\(/);
  assert.match(dashboard, /mode === 'plant'/);
  assert.match(dashboard, /mode === 'maintenance'/);
  assert.match(dashboard, /mode === 'drilling'/);
  assert.match(dashboard, /mode === 'management'/);
  assert.match(dashboard, /jefe man\\\.\\? eq\|jefe mant\|planificador\.\*mant/);
  assert.match(dashboard, /config\.shortcuts\.map/);
});
