import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const route = await readFile(
  new URL('../app/api/produccion/data-entry/route.ts', import.meta.url),
  'utf8'
);
const migration = await readFile(
  new URL('../supabase/migrations/20260829200338_harden_production_manual_entry_atomic_v1.sql', import.meta.url),
  'utf8'
);

test('manual production writes require the production operations module', () => {
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.PROD_OPERACIONES, true\)/);
  assert.match(route, /if \(!access\.authorized\) return access\.response/);
});

test('manual production API delegates the write bundle to one transactional RPC', () => {
  assert.match(route, /\.rpc\('create_production_manual_entry_v1'/);
  assert.match(route, /p_organization_id: context\.organizationId/);
  assert.match(route, /p_actor_id: context\.userId/);
  assert.doesNotMatch(route, /\.insert\(/);
  assert.doesNotMatch(route, /Promise\.all/);
});

test('manual batch exception is isolated from the historical Excel allowlist', () => {
  assert.match(migration, /pg_get_expr\(c\.conbin, c\.conrelid\)/);
  assert.match(migration, /source_type = 'manual'/);
  assert.match(migration, /manual:\/\/production\/\(mineral_transport\|plant_metallurgy\)/);
  assert.match(migration, /or \(%s\)/);
  assert.match(migration, /v_old_expr/);
});

test('manual production RPC owns the full bundle atomically', () => {
  assert.match(migration, /create or replace function public\.create_production_manual_entry_v1/);
  assert.match(migration, /insert into public\.production_import_batches/);
  assert.match(migration, /insert into public\.production_data_entry_sessions/);
  assert.match(migration, /insert into public\.production_material_movements/);
  assert.match(migration, /insert into public\.production_plant_shifts/);
  assert.match(migration, /insert into public\.production_metallurgy_results/);
  assert.match(migration, /production_metallurgy_automatic_v1/);
  assert.match(migration, /production_normalization_rules/);
});

test('manual production RPC is service-role-only with a controlled search path', () => {
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = 'public', 'pg_temp'/);
  assert.match(migration, /revoke all on function public\.create_production_manual_entry_v1\(uuid, uuid, text, jsonb\) from public/);
  assert.match(migration, /from anon/);
  assert.match(migration, /from authenticated/);
  assert.match(migration, /grant execute on function public\.create_production_manual_entry_v1\(uuid, uuid, text, jsonb\) to service_role/);
  assert.match(migration, /p\.organization_id = p_organization_id/);
  assert.match(migration, /p\.status = 'active'/);
});
