import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const apiUrl = new URL('../app/api/produccion/geologia/route.ts', import.meta.url);
const dashboardUrl = new URL('../components/production/geologia-dashboard.tsx', import.meta.url);
const todayUrl = new URL('../components/production/geologia-today-decision-board.tsx', import.meta.url);
const readinessUrl = new URL('../components/production/geologia-hole-evidence-readiness.tsx', import.meta.url);
const interpretationUrl = new URL('../components/production/geologia-interpretation.tsx', import.meta.url);
const columnUrl = new URL('../components/production/geologia-interpretation-column.tsx', import.meta.url);
const comparatorUrl = new URL('../components/production/geologia-interpretation-comparator.tsx', import.meta.url);

test('geology API classifies source-report intervals separately from formal logging', async () => {
  const api = await readFile(apiUrl, 'utf8');
  assert.match(api, /operational_source_interval/);
  assert.match(api, /explicit_formal_logging/);
  assert.match(api, /unclassified_interval/);
  assert.match(api, /production_drilling_source_reports/);
  assert.match(api, /operationalIntervals/);
  assert.match(api, /formalLoggingIntervals/);
  assert.match(api, /no hay logging geológico formal explícitamente validado/i);
});

test('today and hole workspace never present operational intervals as formal logging', async () => {
  const [dashboard, today, readiness] = await Promise.all([
    readFile(dashboardUrl, 'utf8'),
    readFile(todayUrl, 'utf8'),
    readFile(readinessUrl, 'utf8'),
  ]);
  assert.match(today, /intervalos operacionales estructurados desde reportes de perforación/i);
  assert.match(today, /no equivalen a logging geológico formal/i);
  assert.doesNotMatch(today, /intervalos de logging disponibles/i);
  assert.match(dashboard, /Intervalos operacionales por profundidad/);
  assert.match(dashboard, /evidence_class==='operational_source_interval'/);
  assert.match(readiness, /Intervalos operacionales/);
  assert.match(readiness, /no equivalen a logging geológico formal/i);
  assert.doesNotMatch(readiness, /Preparación de evidencia/);
});

test('interpretation surfaces preserve the operational interval provenance boundary', async () => {
  const [interpretation, column, comparator] = await Promise.all([
    readFile(interpretationUrl, 'utf8'),
    readFile(columnUrl, 'utf8'),
    readFile(comparatorUrl, 'utf8'),
  ]);
  assert.match(interpretation, /provienen de reportes de perforación/i);
  assert.match(interpretation, /no equivalen a logging geológico formal/i);
  assert.match(column, /Columna de evidencia por profundidad/);
  assert.match(column, /no logging formal/i);
  assert.match(comparator, /Intervalos operacionales estructurados/);
});
