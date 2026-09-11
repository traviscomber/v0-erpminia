import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const page = await fs.readFile('app/dashboard/mantenimiento/page.tsx', 'utf8');
const assistant = await fs.readFile('components/maintenance/maintenance-senior-assistant.tsx', 'utf8');

test('maintenance workspaces simplify progressively down the role chain', () => {
  assert.match(page, /leadership:\[/);
  assert.match(page, /planning:\[/);
  assert.match(page, /general:\[/);
  assert.match(page, /if\(mode==='execution'\)\{/);
  assert.match(page, /<MobileTerrainPanel \/>/);
  assert.match(page, /mode==='planning'\s*\? maintenanceFlow\.slice\(0,3\)/s);
  assert.match(page, /Planificar → Preparar → Ejecutar/);
});

test('maintenance planning queue stays focused on decisions that make work executable', () => {
  assert.match(page, /planningKinds = new Set\(\['operational_review','preventive_overdue','assignment_needed','meter_review','operational_blocker'\]\)/);
  assert.match(page, /Cola de planificación/);
  assert.match(page, /Por asignar/);
  assert.match(page, /Asignar trabajo/);
  assert.match(page, /Qué debo dejar listo hoy/);
  assert.doesNotMatch(page, /Cola de ejecución/);
  assert.doesNotMatch(page, /executionKinds = new Set/);
});

test('maintenance leadership queue contains only decisions owned by leadership', () => {
  assert.match(page, /leadershipKinds = new Set\(\['operational_review','preventive_overdue','operational_blocker','ready_to_close','reliability'\]\)/);
  assert.match(page, /rawActions\.filter\(\(action\)=>leadershipKinds\.has\(action\.kind\)\)/);
  assert.match(page, /Qué debo decidir o destrabar/);
  assert.match(page, /Decisiones de jefatura/);
  assert.match(page, /Atender prioridad/);
});

test('maintenance header exposes one secondary action and one role-aware primary action for planning and leadership', () => {
  const actions = page.match(/<PageHeaderActions>(.*?)<\/PageHeaderActions>/s)?.[1] || '';
  assert.match(actions, /variant="outline"/);
  assert.match(actions, />Actualizar</);
  assert.match(actions, /Asignar trabajo/);
  assert.match(actions, /Planificar/);
  assert.match(actions, /Atender prioridad/);
  assert.match(actions, />Crear orden</);
  assert.doesNotMatch(actions, />Ver órdenes</);
  assert.equal((actions.match(/variant="outline"/g) || []).length, 1);
});

test('maintenance UI uses semantic theme tokens and no decorative hardcoded colors', () => {
  assert.doesNotMatch(page, /#[0-9a-fA-F]{3,8}/);
  assert.doesNotMatch(assistant, /#[0-9a-fA-F]{3,8}/);
  assert.match(assistant, /text-primary/);
  assert.match(assistant, /bg-background/);
});

test('floating maintenance assistant has accessible launcher and human authority copy', () => {
  assert.match(assistant, /aria-label="Abrir Asistente Senior de Mantenimiento"/);
  assert.match(assistant, /decisión humana/);
  assert.match(assistant, /Canónico/);
});

test('control center avoids duplicate direct row actions', () => {
  assert.doesNotMatch(page, /Ficha 360/);
  assert.match(page, /aria-label="Abrir acción"/);
});
