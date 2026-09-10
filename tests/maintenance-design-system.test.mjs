import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const page = await fs.readFile('app/dashboard/mantenimiento/page.tsx', 'utf8');
const assistant = await fs.readFile('components/maintenance/maintenance-senior-assistant.tsx', 'utf8');

test('maintenance control center keeps four KPI cards maximum per role', () => {
  const metricsBlock = page.match(/const metrics\s*=\s*mode==='execution'\s*\?\s*\[(.*?)\]\s*as const\s*:\s*\[(.*?)\]\s*as const;/s);
  assert.ok(metricsBlock, 'role-aware metrics block should exist');
  const executionCount = (metricsBlock[1].match(/\['/g) || []).length;
  const defaultCount = (metricsBlock[2].match(/\['/g) || []).length;
  assert.equal(executionCount, 4);
  assert.equal(defaultCount, 4);
});

test('maintenance header exposes one secondary action and one role-aware primary action', () => {
  const actions = page.match(/<PageHeaderActions>(.*?)<\/PageHeaderActions>/s)?.[1] || '';
  assert.match(actions, /variant="outline"/);
  assert.match(actions, />Actualizar</);
  assert.match(actions, /mode==='execution'/);
  assert.match(actions, />Ver órdenes</);
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
