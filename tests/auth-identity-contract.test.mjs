import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const authSession = await readFile(new URL('../lib/api/auth-session.ts', import.meta.url), 'utf8');
const guard = await readFile(new URL('../lib/api/guard.ts', import.meta.url), 'utf8');
const adminData = await readFile(new URL('../lib/api/admin-data.ts', import.meta.url), 'utf8');

test('Supabase auth resolves persisted legacy profile identity links before verified-email fallback', () => {
  assert.match(authSession, /auth_profile_identity_links/);
  assert.match(authSession, /\.eq\('auth_user_id', userId\)/);
  assert.match(authSession, /allowVerifiedEmailFallback/);
  assert.match(authSession, /Boolean\(user\.email_confirmed_at\)/);
  assert.match(authSession, /link_reason: 'verified_email_runtime_bridge'/);
  assert.doesNotMatch(authSession, /user_metadata.*role/);
});

test('superadmin is accepted by the administrative guard', () => {
  assert.match(guard, /ADMIN_ROLES = new Set\(\['admin', 'superadmin', 'super_admin'\]\)/);
});

test('admin user writes use an auditable unique role assignment and compensate auth creation failures', () => {
  assert.match(adminData, /onConflict: 'user_id,organization_id'/);
  assert.match(adminData, /assigned_by: input\.assignedBy/);
  assert.match(adminData, /auth\.admin\.deleteUser\(createdUserId\)/);
});
