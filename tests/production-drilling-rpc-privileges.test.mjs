import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../supabase/migrations/20260829213000_harden_sondaje_location_review_rpc_execute.sql',
  import.meta.url,
);
const organizationContextUrl = new URL('../lib/api/organization-context.ts', import.meta.url);
const supabaseServerUrl = new URL('../lib/supabase-server.ts', import.meta.url);

const signature = 'public.resolve_drill_hole_location_manual_review(uuid, uuid, uuid, uuid, text)';

test('manual sondaje location RPC is executable only by service_role', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.ok(sql.includes(`revoke execute on function ${signature}`));
  assert.match(sql, /from\s+public,\s*anon,\s*authenticated\s*;/i);
  assert.ok(sql.includes(`grant execute on function ${signature}`));
  assert.match(sql, /to\s+service_role\s*;/i);
});

test('sondaje organization context uses the privileged server client', async () => {
  const [organizationContext, supabaseServer] = await Promise.all([
    readFile(organizationContextUrl, 'utf8'),
    readFile(supabaseServerUrl, 'utf8'),
  ]);

  assert.match(organizationContext, /getSupabaseServerClient/);
  assert.match(supabaseServer, /SUPABASE_SERVICE_ROLE_KEY/);
});
