import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const panelUrl = new URL('../components/dashboard/decision-cases-panel.tsx', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('Decision Cases link to the current target specialist without executing operational mutations', async () => {
  const source = await read(panelUrl);
  assert.match(source, /const domainHref: Record<string, string>/);
  assert.match(source, /maintenance: '\/dashboard\/mantenimiento'/);
  assert.match(source, /geology: '\/dashboard\/produccion\/geologia'/);
  assert.match(source, /inventory: '\/dashboard\/inventario'/);
  assert.match(source, /procurement: '\/dashboard\/compras'/);
  assert.match(source, /Abrir \{labels\[item\.target_domain\]/);
  assert.doesNotMatch(source, /maintenance_work_orders/);
  assert.doesNotMatch(source, /procurement_award_decisions/);
});

test('Decision Cases only derive explainability fields from explicit headings already present in the grounded answer', async () => {
  const source = await read(panelUrl);
  assert.match(source, /function parseExplicitCaseSections/);
  assert.match(source, /incertidumbre\|contradicciones\?/);
  assert.match(source, /evidencia faltante/);
  assert.match(source, /siguiente validaci\[oó\]n humana/);
  assert.match(source, /if \(!match\) continue/);
  assert.match(source, /item\.uncertainty \|\| explicit\.uncertainty/);
  assert.match(source, /item\.recommended_human_action \|\| explicit\.nextHumanAction/);
});

test('advisory semantics stay visible in the Executive Center panel', async () => {
  const source = await read(panelUrl);
  assert.match(source, /No aprueban, ejecutan ni reemplazan decisiones operacionales/);
  assert.match(source, /<Badge variant="secondary">No canónico<\/Badge>/);
  assert.match(source, /Esto no significa ausencia de riesgos ni decisiones pendientes/);
});
