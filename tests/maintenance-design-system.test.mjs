import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const page = await fs.readFile('app/dashboard/mantenimiento/page.tsx', 'utf8');
const assistant = await fs.readFile('components/maintenance/maintenance-senior-assistant.tsx', 'utf8');

test('maintenance control center keeps four KPI cards maximum', () => {
  const metricsBlock = page.match(/const metrics=\[(.*?)\] as const;/s)?.[1] || '';
  const metricCount = (metricsBlock.match(/\['/g) || []).length;
  assert.equal(metricCount, 4);
});

test('maintenance header exposes one primary and one secondary action', () => {
  const actions = page.match(/<PageHeaderActions>(.*?)<\/PageHeaderActions>/s)?.[1] || '';
  assert.match(actions, /variant="outline"/);
  assert.match(actions, />Crear orden</);
  assert.equal((actions.match(/<Button/g) || []).length, 2);
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
