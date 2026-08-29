import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260829165753_add_sii_demo_runs_v1.sql', 'utf8');
const api = fs.readFileSync('app/api/sii/demo/route.ts', 'utf8');
const page = fs.readFileSync('app/dashboard/administracion/sii/demo/page.tsx', 'utf8');
const layout = fs.readFileSync('app/dashboard/administracion/sii/layout.tsx', 'utf8');
const setupNavigator = fs.readFileSync('components/sii/sii-setup-navigator.tsx', 'utf8');

test('SII demo data is isolated in a server-only ledger', () => {
  assert.match(migration, /create table if not exists public\.sii_demo_runs/);
  assert.match(migration, /alter table public\.sii_demo_runs enable row level security/);
  assert.match(migration, /revoke all on public\.sii_demo_runs from public, anon, authenticated/);
  assert.match(migration, /revoke insert, update, delete on public\.sii_demo_runs from service_role/);
  assert.match(migration, /grant select on public\.sii_demo_runs to service_role/);
  assert.doesNotMatch(migration, /insert into public\.sii_(?:integrations|cafs|folio_reservations|outbound_dtes)/);
});

test('demo mutations are admin mediated and service-role only', () => {
  assert.match(api, /requireAdmin\(request\)/);
  assert.match(api, /create_sii_demo_run_v1/);
  assert.match(api, /clear_sii_demo_runs_v1/);
  assert.match(migration, /security definer[\s\S]*set search_path = 'public', 'pg_temp'/);
  assert.match(migration, /p\.organization_id = p_organization_id/);
  assert.match(migration, /p\.status = 'active'/);
  assert.match(migration, /grant execute on function public\.create_sii_demo_run_v1\(uuid, uuid, text\) to service_role/);
  assert.match(migration, /grant execute on function public\.clear_sii_demo_runs_v1\(uuid, uuid\) to service_role/);
  assert.doesNotMatch(migration, /grant execute on function public\.(?:create_sii_demo_run_v1|clear_sii_demo_runs_v1)[^;]* to authenticated/);
});

test('demo workflow can never contact SII transport or consume fiscal state', () => {
  assert.doesNotMatch(api, /dte-transport|requestSiiSessionToken|uploadSiiDteEnvelope|maullin|palena/i);
  assert.doesNotMatch(api, /sii_integrations|sii_cafs|sii_folio_reservations|sii_outbound_dtes/);
  assert.match(api, /siiNetworkCalled: false/);
  assert.match(migration, /'network',false/);
  assert.match(migration, /'DOK-DEMO'/);
  assert.match(migration, /'RCH-DEMO'/);
});

test('demo UI is explicit and removable', () => {
  assert.match(layout, /SiiSetupNavigator/);
  assert.match(setupNavigator, /\/demo/);
  assert.match(setupNavigator, /Ir al demo seguro/);
  assert.match(page, /Modo demo aislado/);
  assert.match(page, /no llama a Maullín ni Palena/);
  assert.match(page, /no reserva folios fiscales/);
  assert.match(page, /Probar aceptación/);
  assert.match(page, /Probar rechazo/);
  assert.match(page, /Limpiar demo/);
  assert.match(page, /NO CONTACTADA/);
  assert.match(page, /NO CONSUMIDO/);
});
