import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);
const productionLayoutUrl = new URL('../app/dashboard/produccion/layout.tsx', import.meta.url);
const drillingHomeUrl = new URL('../app/dashboard/produccion/sondaje/page.tsx', import.meta.url);

test('geology keeps decision views as local controls inside Production instead of a second navbar', async () => {
  const shell = await readFile(shellUrl, 'utf8');

  for (const label of ['Hoy', 'Sondajes', 'Interpretación', 'Evidencia', 'Histórico']) {
    assert.match(shell, new RegExp(`label: '${label}'`));
  }

  assert.match(shell, /Controles locales de Geología/);
  assert.match(shell, /role="tablist"/);
  assert.doesNotMatch(shell, /sticky top-0/);
  assert.doesNotMatch(shell, /Vistas principales de Geología/);
  assert.match(shell, /\['priorities', 'Prioridades'\]/);
  assert.match(shell, /\['pending', 'Tareas'\]/);
  assert.match(shell, /\['corevision', 'CoreVision'\]/);
  assert.match(shell, /\['matrix', 'Matriz'\]/);
  assert.match(shell, /\['results', 'Resultados'\]/);
  assert.match(shell, /\['completeness', 'Cobertura'\]/);
  assert.match(shell, /\['canonical', 'Estado'\]/);
  assert.match(shell, /Resultados, cobertura y estado canónico/);
  assert.doesNotMatch(shell, /\['canonical', 'Fuentes'\]/);
  assert.match(shell, /mismo sondaje canónico de Producción → Perforación/);
});

test('production uses one operational flow rail while keeping technical disciplines non-sequential', async () => {
  const [layout, drillingHome] = await Promise.all([
    readFile(productionLayoutUrl, 'utf8'),
    readFile(drillingHomeUrl, 'utf8'),
  ]);

  assert.match(layout, /label: 'Resumen'.*lane: 'flow'.*step: 1/);
  assert.match(layout, /label: 'Mina \/ Sector'.*lane: 'flow'.*step: 2/);
  assert.match(layout, /label: 'Perforación'.*lane: 'flow'.*step: 3/);
  assert.match(layout, /label: 'Transporte'.*lane: 'flow'.*step: 4/);
  assert.match(layout, /label: 'Planta \/ Metalurgia'.*lane: 'flow'.*step: 5/);
  assert.match(layout, /label: 'Geología'.*lane: 'technical'/);
  assert.match(layout, /label: 'Topografía'.*lane: 'technical'/);
  assert.match(layout, /label: 'Química'.*lane: 'technical'/);
  assert.match(layout, /aria-label="Flujo operacional de Producción"/);
  assert.match(layout, /aria-label="Control técnico de Producción"/);
  assert.match(layout, /String\(item\.step\)\.padStart\(2, '0'\)/);
  assert.doesNotMatch(layout, /Grupos de Producción/);
  assert.doesNotMatch(layout, /activeGroupKey/);
  assert.match(drillingHome, /mismo sondaje canónico/);
  assert.match(drillingHome, /no son dos bases de datos distintas/i);
  assert.match(drillingHome, /\/dashboard\/produccion\/geologia\?tab=holes/);
});