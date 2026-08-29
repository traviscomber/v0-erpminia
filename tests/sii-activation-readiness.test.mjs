import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readinessApi = fs.readFileSync('app/api/sii/readiness/route.ts', 'utf8');
const profilePage = fs.readFileSync('app/dashboard/administracion/sii/perfil/page.tsx', 'utf8');
const preparationPage = fs.readFileSync('app/dashboard/administracion/sii/preparacion/page.tsx', 'utf8');
const layout = fs.readFileSync('app/dashboard/administracion/sii/layout.tsx', 'utf8');

test('SII readiness is admin scoped and does not mutate fiscal state', () => {
  assert.match(readinessApi, /requireAdmin\(request\)/);
  assert.match(readinessApi, /Promise\.all/);
  assert.match(readinessApi, /readyForCertification/);
  assert.match(readinessApi, /readyForProduction/);
  assert.match(readinessApi, /acceptedCertificationDtes/);
  assert.doesNotMatch(readinessApi, /\.insert\(/);
  assert.doesNotMatch(readinessApi, /\.update\(/);
  assert.doesNotMatch(readinessApi, /\.rpc\(/);
});

test('production readiness requires real certification acceptance evidence', () => {
  assert.match(readinessApi, /environment', 'certification'/);
  assert.match(readinessApi, /document_type', 33/);
  assert.match(readinessApi, /status', 'accepted'/);
  assert.match(readinessApi, /readyForCertification && certifiedDteCount > 0/);
});

test('issuer profile UI keeps company and signer identities distinct', () => {
  assert.match(profilePage, /RUT empresa/);
  assert.match(profilePage, /RUT firmante/);
  assert.match(profilePage, /RutEnvia\/rutSender/);
  assert.match(profilePage, /\/api\/sii\/issuer/);
  assert.match(profilePage, /Guardar perfil tributario/);
  assert.match(profilePage, /no se emitió ningún DTE/i);
});

test('activation UI surfaces external blockers without inventing data', () => {
  assert.match(preparationPage, /requiere dato real/);
  assert.match(preparationPage, /Esperando datos reales/);
  assert.match(preparationPage, /no se usan datos ficticios/i);
  assert.match(preparationPage, /\/api\/sii\/readiness/);
  assert.match(layout, /Perfil tributario/);
  assert.match(layout, /Preparación/);
});
