import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('app/api/maintenance/data-readiness/route.ts', 'utf8');
const page = fs.readFileSync('app/dashboard/mantenimiento/data-readiness/page.tsx', 'utf8');

test('asset recovery candidates remain tenant scoped and derive from the canonical asset queue', () => {
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(api, /canonical_assets_current/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /inferMachineFamilyFromText/);
  assert.match(api, /resolveTechnicalSheetReference/);
});

test('technical references are discovery candidates, never automatic canonical materialization', () => {
  assert.match(api, /reference_candidate_pending_validation/);
  assert.match(api, /no materializa fabricante, modelo, tipo, criticidad, estado, ubicación ni especificaciones/i);
  assert.match(page, /Pendiente de validación · no canónica/);
  assert.match(page, /Recuperación asistida/);
  assert.doesNotMatch(api, /\.update\(|\.upsert\(|\.insert\(/);
});

test('data readiness keeps human review actionable without treating candidates as observed facts', () => {
  assert.match(page, /Revisar fuente/);
  assert.match(page, /Abrir ficha/);
  assert.match(page, /referencias sugeridas son sólo pistas de recuperación/i);
});
