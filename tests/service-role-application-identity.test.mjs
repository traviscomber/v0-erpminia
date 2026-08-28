import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const client = fs.readFileSync('lib/supabase-server.ts', 'utf8');
const context = fs.readFileSync('lib/api/organization-context.ts', 'utf8');
const migration = fs.readFileSync(
  'supabase/migrations/20260828014500_bridge_service_role_application_identity.sql',
  'utf8',
);

test('organization context forwards only the already authenticated application user', () => {
  assert.match(context, /getSupabaseServerClient\(auth\.user\.id\)/);
  assert.match(client, /x-application-user-id/);
});

test('database identity bridge trusts the forwarded actor only for service role', () => {
  assert.match(migration, /when auth\.role\(\) = 'service_role'/i);
  assert.match(migration, /request\.headers/i);
  assert.match(migration, /x-application-user-id/i);
  assert.match(migration, /else coalesce[\s\S]*auth\.uid\(\)/i);
  assert.match(migration, /revoke all on function[\s\S]*from public/i);
});
