import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const route = await fs.readFile('app/api/maintenance/viewer-context/route.ts', 'utf8');

test('generic maintenance viewers do not surface synthetic all-roles cargo copy', () => {
  assert.match(route, /const mode = resolveMode\(cargoName\)/);
  assert.match(route, /cargoName: mode === 'general' \? null : cargoName/);
});

test('maintenance role routing stays explicit for leadership planning and execution', () => {
  assert.match(route, /jefe departamento de mantenimiento/);
  assert.match(route, /jefe de planificación/);
  assert.match(route, /cargo\.startsWith\('mecánico'\)/);
});
