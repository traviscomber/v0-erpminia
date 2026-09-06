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
  assert.match(shell, /\['canonical', 'Fuentes'\]/);
  assert.match(shell, /mismo sondaje canónico de Producción → Perforación/);
});

test('production separates drilling execution from geology without duplicating drill-hole identity', async () => {
  const [layout, drillingHome] = await Promise.all([
    readFile(productionLayoutUrl, 'utf8'),
    readFile(drillingHomeUrl, 'utf8'),
  ]);

  assert.match(layout, /label: 'Perforación'.*group: 'workflow'/);
  assert.match(layout, /label: 'Geología'.*group: 'technical'/);
  assert.match(layout, /activeItems = visibleItems\.filter\(\(item\) => item\.group === activeGroupKey\)/);
  assert.match(drillingHome, /mismo sondaje canónico/);
  assert.match(drillingHome, /no son dos bases de datos distintas/i);
  assert.match(drillingHome, /\/dashboard\/produccion\/geologia\?tab=holes/);
});
