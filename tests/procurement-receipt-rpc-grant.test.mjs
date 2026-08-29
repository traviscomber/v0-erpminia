import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL('../supabase/migrations/20260829215000_restrict_receive_purchase_order_execute.sql', import.meta.url);

test('legacy receive_purchase_order RPC is service-role only', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  const signature = 'public.receive_purchase_order(uuid, jsonb, text, uuid, text, text)';

  assert.match(sql, new RegExp(`REVOKE EXECUTE ON FUNCTION ${signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} FROM PUBLIC;`, 'i'));
  assert.match(sql, new RegExp(`REVOKE EXECUTE ON FUNCTION ${signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} FROM authenticated;`, 'i'));
  assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION ${signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} TO service_role;`, 'i'));
});
