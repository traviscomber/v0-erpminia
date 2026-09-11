import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboard = await readFile(new URL('../app/dashboard/mantenimiento/page.tsx', import.meta.url), 'utf8');
const terrain = await readFile(new URL('../components/maintenance/mobile-terrain-panel.tsx', import.meta.url), 'utf8');

test('execution users receive a dedicated minimal mobile surface', () => {
  assert.match(dashboard, /mode==='execution' \? <div className="md:hidden"><MobileTerrainPanel \/><\/div> : null/);
  assert.match(dashboard, /mode==='execution' \? 'hidden md:block' : undefined/);
});

test('mobile terrain surface exposes one real next action without mobile close-out', () => {
  assert.match(terrain, /\/api\/maintenance\/control-center/);
  assert.match(terrain, /Siguiente acción/);
  assert.match(terrain, /Abrir trabajo/);
  assert.match(terrain, /Ver todas las órdenes/);
  assert.match(terrain, /El cierre requiere evidencia y validación del responsable/);
  assert.doesNotMatch(terrain, /mobile-quick-complete/);
  assert.doesNotMatch(terrain, /MARCAR COMPLETADO/);
});
