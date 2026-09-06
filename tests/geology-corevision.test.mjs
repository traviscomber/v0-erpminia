import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiUrl = new URL('../app/api/produccion/geologia/corevision/route.ts', import.meta.url);
const uiUrl = new URL('../components/production/geologia-corevision.tsx', import.meta.url);
const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260906143000_add_geology_corevision.sql', import.meta.url);

test('CoreVision is geology-authorized and mutations require write access', async () => {
  const api = await readFile(apiUrl, 'utf8');
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA\)/);
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA, true\)/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
});

test('CoreVision keeps visual evidence server-only and private', async () => {
  const migration = await readFile(migrationUrl, 'utf8');
  assert.match(migration, /'geology-core-images'[\s\S]*false/);
  assert.match(migration, /production_geology_core_images enable row level security/);
  assert.match(migration, /production_geology_core_image_analyses enable row level security/);
  assert.match(migration, /production_geology_core_image_reviews enable row level security/);
  assert.match(migration, /revoke all on table public\.production_geology_core_images from anon, authenticated/);
  assert.match(migration, /grant all on table public\.production_geology_core_images to service_role/);
});

test('CoreVision guardrails never promote visual AI to geological truth', async () => {
  const api = await readFile(apiUrl, 'utf8');
  assert.match(api, /semejanza visual NO es identidad geológica, probabilidad geológica ni continuidad/i);
  assert.match(api, /No infieras ley, recurso, reserva, dominio, contacto, control estructural, geometría 3D ni continuidad espacial/i);
  assert.match(api, /No conviertas una clasificación visual en dato canónico/i);
  assert.match(api, /evidence_against/);
  assert.match(api, /missing_evidence/);
  assert.doesNotMatch(api, /from\('production_geology_intervals'\)\.update/);
});

test('only human validated visual examples become historical exemplars', async () => {
  const api = await readFile(apiUrl, 'utf8');
  assert.match(api, /production_geology_core_image_reviews/);
  assert.match(api, /\.in\('decision', \['validated', 'edited'\]\)/);
  assert.match(api, /\.eq\('status', 'validated'\)/);
  assert.match(api, /EJEMPLOS HISTÓRICOS VALIDADOS POR GEÓLOGO/);
});

test('CoreVision capture supports mobile camera and explicit human review', async () => {
  const ui = await readFile(uiUrl, 'utf8');
  const shell = await readFile(shellUrl, 'utf8');
  assert.match(ui, /capture="environment"/);
  assert.match(ui, /Iluminación uniforme/);
  assert.match(ui, /Imagen nítida \/ foco confirmado/);
  assert.match(ui, /Validar como ejemplo histórico/);
  assert.match(ui, /Evidencia que contradice/);
  assert.match(ui, /no es probabilidad geológica/i);
  assert.match(shell, /\['corevision', 'CoreVision'\]/);
  assert.match(shell, /<GeologiaCoreVision \/>/);
});
