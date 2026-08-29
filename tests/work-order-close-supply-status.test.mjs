import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20260829023500_fix_work_order_close_supply_status_v1.sql', import.meta.url), 'utf8');

test('safe work order close keeps supply needs in an allowed covered state', () => {
  assert.match(migration, /work_order_supply_needs\s+set\s+status='covered'/i);
  assert.doesNotMatch(migration, /work_order_supply_needs\s+set\s+status='fulfilled'/i);
});
