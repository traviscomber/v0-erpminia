import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const dashboardUrl = new URL('../components/production/chemistry-dashboard.tsx', import.meta.url);

test('chemistry separates current process assays from historical mine chemistry', async () => {
  const dashboard = await readFile(dashboardUrl, 'utf8');

  assert.match(dashboard, /type ViewKey='process'\|'historical'/);
  assert.match(dashboard, /useState<ViewKey>\('process'\)/);
  assert.match(dashboard, /Vista de Química/);
  assert.match(dashboard, />Proceso</);
  assert.match(dashboard, />Mina histórica</);
  assert.match(dashboard, /Dos contextos analíticos separados/);
  assert.match(dashboard, /Ensayos de Planta\/Metalurgia/);
  assert.match(dashboard, /Muestras especiales 2016–2017 · contexto histórico/);
  assert.match(dashboard, /no son ensayes de sondaje ni ley representativa del plan 2026/i);
  assert.match(dashboard, /No son ensayes de sondaje, no representan la ley del plan 2026/i);
  assert.match(dashboard, /Sector\/Pozo no se fuerzan/);
});

test('process view does not substitute missing assays with historical chemistry', async () => {
  const dashboard = await readFile(dashboardUrl, 'utf8');

  assert.match(dashboard, /Sin resultados de proceso en el período/);
  assert.match(dashboard, /No se muestran valores estimados ni se sustituyen ensayos faltantes con química histórica/);
  assert.match(dashboard, /Linaje de proceso/);
  assert.match(dashboard, /Linaje histórico/);
});
