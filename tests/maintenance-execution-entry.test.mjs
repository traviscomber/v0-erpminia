import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const shell = await readFile(new URL('../components/layout/dashboard-shell.tsx', import.meta.url), 'utf8');
const viewerMode = await readFile(new URL('../lib/maintenance/viewer-mode.ts', import.meta.url), 'utf8');

test('field maintenance executors enter through assigned-work maintenance home', () => {
  assert.match(shell, /resolveMaintenanceViewerMode\(user\?\.cargo \|\| null\)/);
  assert.match(shell, /pathname !== '\/dashboard'/);
  assert.match(shell, /router\.replace\('\/dashboard\/mantenimiento'\)/);
});

test('execution routing reuses the canonical maintenance viewer-mode resolver', () => {
  assert.match(viewerMode, /cargo\.startsWith\('mecánico'\)/);
  assert.match(viewerMode, /cargo\.startsWith\('jefe de taller mina'\)/);
  assert.match(viewerMode, /cargo === 'encargado de camionetas y camiones'/);
  assert.match(viewerMode, /cargo === 'soldador'/);
  assert.match(viewerMode, /return 'execution'/);
});
