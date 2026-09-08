import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL('../supabase/migrations/20260908174000_record_deep_specialist_decision_case_revalidation.sql', import.meta.url);
const maintenanceUrl = new URL('../app/api/maintenance/senior-assistant/route.ts', import.meta.url);
const geologyUrl = new URL('../app/api/produccion/geologia/assistant/route.ts', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('deep specialists preserve their own runtime stores while receiving advisory handoffs', async () => {
  const [maintenance, geology] = await Promise.all([read(maintenanceUrl), read(geologyUrl)]);

  assert.match(maintenance, /maintenance_ai_conversations/);
  assert.match(maintenance, /maintenance_ai_messages/);
  assert.match(maintenance, /maintenance_ai_user_memory/);
  assert.match(maintenance, /loadSupportAdvisoryHandoffs\(context, 'maintenance', message\)/);

  assert.match(geology, /geology_ai_conversations/);
  assert.match(geology, /geology_ai_messages/);
  assert.match(geology, /geology_ai_user_memory/);
  assert.match(geology, /loadSupportAdvisoryHandoffs\(context, 'geology', message\)/);
});

test('deep specialist revalidation runs only after grounded assistant persistence', async () => {
  const migration = await read(migrationUrl);

  assert.match(migration, /new\.role is distinct from 'assistant'/);
  assert.match(migration, /jsonb_typeof\(new\.source_refs\) <> 'array'/);
  assert.match(migration, /jsonb_array_length\(new\.source_refs\) = 0/);
  assert.match(migration, /after insert on public\.maintenance_ai_messages/);
  assert.match(migration, /after insert on public\.geology_ai_messages/);
  assert.match(migration, /record_deep_specialist_decision_case_revalidation/);
});

test('deep specialist revalidation is scoped to the latest review request and current user', async () => {
  const migration = await read(migrationUrl);

  assert.match(migration, /m\.conversation_id = new\.conversation_id/);
  assert.match(migration, /m\.organization_id = new\.organization_id/);
  assert.match(migration, /m\.user_id = new\.user_id/);
  assert.match(migration, /m\.role = 'user'/);
  assert.match(migration, /order by m\.created_at desc/);
  assert.match(migration, /limit 1/);
  assert.match(migration, /decision\[\[:space:\]\]\*case/);
  assert.match(migration, /revalid/);
  assert.match(migration, /revis/);
});

test('deep specialist revalidation updates only open advisory cases for the same tenant user target', async () => {
  const migration = await read(migrationUrl);

  assert.match(migration, /from public\.motil_ai_decision_cases dc/);
  assert.match(migration, /dc\.organization_id = new\.organization_id/);
  assert.match(migration, /dc\.created_by_user_id = new\.user_id/);
  assert.match(migration, /dc\.target_domain = target_domain_value/);
  assert.match(migration, /dc\.status = 'open'/);
  assert.match(migration, /order by dc\.created_at desc/);
  assert.match(migration, /limit 3/);
  assert.match(migration, /last_revalidated_at = coalesce\(new\.created_at, now\(\)\)/);
  assert.match(migration, /last_revalidated_by_user_id = new\.user_id/);
  assert.match(migration, /last_revalidation_evidence_refs = new\.source_refs/);
});

test('deep specialist revalidation migration cannot mutate canonical operational sources', async () => {
  const migration = await read(migrationUrl);

  assert.doesNotMatch(migration, /update\s+public\.maintenance_work_orders/i);
  assert.doesNotMatch(migration, /update\s+public\.canonical_inventory_current/i);
  assert.doesNotMatch(migration, /update\s+public\.canonical_purchase_orders_current/i);
  assert.doesNotMatch(migration, /update\s+public\.production_material_movements/i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.(maintenance_work_orders|canonical_inventory_current|canonical_purchase_orders_current|production_material_movements)/i);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.(maintenance_work_orders|canonical_inventory_current|canonical_purchase_orders_current|production_material_movements)/i);
});
