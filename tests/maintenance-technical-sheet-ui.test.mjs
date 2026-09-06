import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const view = fs.readFileSync('components/maintenance/asset-technical-sheet-clean-view.tsx', 'utf8');
const page = fs.readFileSync('app/dashboard/mantenimiento/equipos/[id]/ficha-tecnica/page.tsx', 'utf8');

test('technical sheet header keeps one primary intent and at most two actions', () => {
  const actions = view.match(/<PageHeaderActions>([\s\S]*?)<\/PageHeaderActions>/)?.[1] || '';
  assert.equal((actions.match(/<Button\b/g) || []).length, 2);
  assert.match(actions, /Crear OT/);
  assert.match(actions, /Ficha completa/);
  assert.doesNotMatch(actions, /Árbol de fallas/);
  assert.match(view, /aria-label="Vistas relacionadas"/);
  assert.match(view, /Árbol de fallas/);
});

test('technical sheet KPI band stays at four canonical operational fields', () => {
  const metrics = view.match(/const metrics = \[([\s\S]*?)\] as const;/)?.[1] || '';
  assert.equal((metrics.match(/^\s*\['/gm) || []).length, 4);
  assert.match(metrics, /Modelo/);
  assert.match(metrics, /Fabricante/);
  assert.match(metrics, /Criticidad/);
  assert.match(metrics, /Próxima mantención/);
  assert.doesNotMatch(metrics, /Familia|Alertas preventivas|Componentes|Fallas/);
});

test('technical sheet keeps trusted and inferred information visually separate', () => {
  assert.match(view, /Referencia técnica validada/);
  assert.match(view, /Identidad coincidente/);
  assert.match(view, /Perfil técnico sugerido/);
  assert.match(view, /No canónico/);
  assert.match(view, /Familia inferida/);
  assert.match(view, /Las sugerencias no completan campos canónicos por sí solas/);
  assert.doesNotMatch(view, /Base técnica real|Modelo real detectado/);
});

test('reference preventive guidance is not presented as observed condition', () => {
  assert.match(view, /Pautas preventivas de referencia/);
  assert.match(view, /no indican falla, vencimiento ni condición operacional observada/);
});

test('equipment technical page uses the cleaned workspace and keeps candidate review visible', () => {
  assert.match(page, /AssetTechnicalReferenceCandidate/);
  assert.match(page, /AssetTechnicalSheetCleanView/);
  assert.doesNotMatch(page, /AssetTechnicalSheetView/);
});
