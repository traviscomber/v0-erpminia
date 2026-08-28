import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const authSession = await readFile(new URL('../lib/api/auth-session.ts', import.meta.url), 'utf8');
const guard = await readFile(new URL('../lib/api/guard.ts', import.meta.url), 'utf8');
const adminData = await readFile(new URL('../lib/api/admin-data.ts', import.meta.url), 'utf8');
const databaseIdentityBridge = await readFile(
  new URL('../supabase/migrations/20260825000855_bridge_legacy_auth_identity_in_database_functions.sql', import.meta.url),
  'utf8'
);
const rlsIdentityBridge = await readFile(
  new URL('../supabase/migrations/20260825001011_bridge_legacy_auth_identity_in_rls_policies.sql', import.meta.url),
  'utf8'
);

test('Supabase auth resolves persisted legacy profile identity links before verified-email fallback', () => {
  assert.match(authSession, /auth_profile_identity_links/);
  assert.match(authSession, /\.eq\('auth_user_id', userId\)/);
  assert.match(authSession, /allowVerifiedEmailFallback/);
  assert.match(authSession, /Boolean\(user\.email_confirmed_at\)/);
  assert.match(authSession, /link_reason: 'verified_email_runtime_bridge'/);
  assert.doesNotMatch(authSession, /user_metadata.*role/);
});

test('assigned auth roles are scoped to the resolved profile organization', () => {
  assert.match(authSession, /if \(profile\?\.organization_id\)/);
  assert.match(authSession, /roleQuery = roleQuery\.eq\('organization_id', profile\.organization_id\)/);
});

test('auth resolution keeps the raw auth UUID alongside the canonical profile UUID', () => {
  assert.match(authSession, /auth_user_id\?: string/);
  assert.match(authSession, /\.eq\('profile_id', profileById\.id\)/);
  assert.match(authSession, /auth_user_id: user\.id/);
  assert.match(authSession, /auth_user_id: identity\.authUserId/);
});

test('superadmin is accepted by the administrative guard', () => {
  assert.match(guard, /ADMIN_ROLES = new Set\(\['admin', 'superadmin', 'super_admin'\]\)/);
});

test('administrative fallback role is scoped to the current organization', () => {
  assert.match(guard, /if \(!auth\.organizationId\)/);
  assert.match(guard, /\.eq\('user_id', auth\.user\.id\)\s*\.eq\('organization_id', auth\.organizationId\)/s);
});

test('admin user writes use an auditable unique role assignment and compensate auth creation failures', () => {
  assert.match(adminData, /onConflict: 'user_id,organization_id'/);
  assert.match(adminData, /assigned_by: input\.assignedBy/);
  assert.match(adminData, /auth\.admin\.deleteUser\(createdUserId\)/);
});

test('database RPCs resolve canonical application users instead of raw auth UUIDs', () => {
  assert.match(databaseIdentityBridge, /current_application_user_id/);
  assert.match(databaseIdentityBridge, /auth_profile_identity_links/);
  assert.match(databaseIdentityBridge, /replace\(\s*pg_get_functiondef\(r\.oid\),\s*'auth\.uid\(\)'/s);
});

test('RLS policies are migrated to the canonical application identity resolver', () => {
  assert.match(rlsIdentityBridge, /current_application_user_id/);
  assert.match(rlsIdentityBridge, /alter policy/);
  assert.match(rlsIdentityBridge, /auth_profile_identity_links_select_own/);
});
