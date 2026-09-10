import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/dashboard/mantenimiento/page.tsx', import.meta.url), 'utf8');

test('maintenance control center exposes the canonical operational loop', () => {
  assert.match(page, /Planificar → Preparar → Ejecutar → Validar → Aprender/);
  assert.match(page, /href:'\/dashboard\/planificacion'/);
  assert.match(page, /href:'\/dashboard\/bodega'/);
  assert.match(page, /href:'\/dashboard\/mantenimiento\/ordenes-trabajo'/);
  assert.match(page, /href:'\/dashboard\/mantenimiento\/ordenes-trabajo\/cierre'/);
  assert.match(page, /href:'\/dashboard\/mantenimiento\/decision-intelligence'/);
});

test('cross-module handoffs are explicit without duplicating ownership', () => {
  assert.match(page, /Producción aporta uso y señales/);
  assert.match(page, /Bodega confirma stock/);
  assert.match(page, /Compras cubre brechas/);
  assert.match(page, /Finanzas consume costos reales/);
  assert.match(page, /Cada etapa usa su fuente canónica/);
});
