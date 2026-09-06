import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const coverageUrl = new URL('../components/production/geologia-data-completeness.tsx', import.meta.url);
const todayUrl = new URL('../components/production/geologia-today-decision-board.tsx', import.meta.url);
const overviewUrl = new URL('../components/production/geologia-mine-evidence-overview.tsx', import.meta.url);
const prioritiesUrl = new URL('../components/production/geologia-next-best-evidence.tsx', import.meta.url);
const promptUrl = new URL('../lib/geology-ai/prompt.ts', import.meta.url);

test('geology coverage describes canonical availability instead of creating missing-data work', async () => {
  const coverage = await readFile(coverageUrl, 'utf8');
  assert.match(coverage, /Qué evidencia tenemos en Geología/);
  assert.match(coverage, /límite de la fuente/);
  assert.match(coverage, /no como una lista de datos que el equipo deba conseguir/i);
  assert.match(coverage, /fuera de cobertura actual/i);
  assert.match(coverage, /no equivalen a logging geológico formal/i);
  assert.doesNotMatch(coverage, /Qué falta realmente en Geología/);
  assert.doesNotMatch(coverage, /> recuperables</);
});

test('daily geology decisions do not turn near-universal absence into tasks', async () => {
  const today = await readFile(todayUrl, 'utf8');
  assert.match(today, /locationIsActionableException/);
  assert.match(today, /locatedPct>=10/);
  assert.match(today, /no se solicita completarlos masivamente/i);
  assert.match(today, /La ausencia estructural de la fuente se informa, pero no se convierte en tarea/i);
  assert.doesNotMatch(today, /Completar ubicación de sondajes/);
});

test('mine coverage is descriptive rather than a recovery ranking', async () => {
  const overview = await readFile(overviewUrl, 'utf8');
  assert.match(overview, /Qué evidencia existe por mina/);
  assert.match(overview, /no crea una obligación de completar datos/i);
  assert.match(overview, /no ranking de minas ni lista de datos por pedir/i);
  assert.doesNotMatch(overview, /Dónde cerrar evidencia primero/);
});

test('priorities and senior assistant share the canonical-first sparse-data rule', async () => {
  const [priorities, prompt] = await Promise.all([readFile(prioritiesUrl, 'utf8'), readFile(promptUrl, 'utf8')]);
  assert.match(priorities, /Trabajar con lo que sí tenemos/);
  assert.match(priorities, /Sin deuda de datos accionable/);
  assert.match(priorities, /Límites conocidos de la fuente/);
  assert.match(prompt, /LÍMITE CONOCIDO DE LA FUENTE/);
  assert.match(prompt, /No pidas al usuario datos ausentes por defecto/);
});
