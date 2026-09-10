import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const page = await fs.readFile('app/dashboard/mantenimiento/page.tsx', 'utf8');
const assistant = await fs.readFile('components/maintenance/maintenance-senior-assistant.tsx', 'utf8');

test('maintenance workspaces simplify progressively down the role chain', () => {
  assert.match(page, /leadership:\[/);
  assert.match(page, /planning:\[/);
  assert.match(page, /execution:\[/);
  assert.match(page, /metrics.length===4\?'xl:grid-cols-4':'xl:grid-cols-3'/);
  assert.match(page, /mode==='execution'\s*\? maintenanceFlow\.slice\(2,4\)/s);
  assert.match(page, /mode==='planning'\s*\? maintenanceFlow\.slice\(0,3\)/s);
  assert.match(page, /Órdenes, bloqueos y evidencia\. Nada más\./);
  assert.match(page, /Planificar → Preparar → Ejecutar/);
  assert.match(page, /Ejecutar → Validar/);
});

test('maintenance role queues stay focused on the decisions each level owns', () => {
  assert.match(page, /executionKinds = new Set\(\['operational_blocker','plan_step','closure_evidence'\]\)/);
  assert.match(page, /planningKinds = new Set\(\['operational_review','preventive_overdue','meter_review','operational_blocker'\]\)/);
  assert.match(page, /Cola de ejecución/);
  assert.match(page, /Cola de planificación/);
});

test('maintenance header exposes one secondary action and one role-aware primary action', () => {
  const actions = page.match(/<PageHeaderActions>(.*?)<\/PageHeaderActions>/s)?.[1] || '';
  assert.match(actions, /variant="outline"/);
  assert.match(actions, />Actualizar</);
  assert.match(actions, />Ver órdenes</);
  assert.match(actions, />Planificar</);
  assert.match(actions, />Crear orden</);
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
