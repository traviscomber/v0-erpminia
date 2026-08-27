import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../supabase/migrations/20260827150500_dedupe_drilling_maintenance_reviews.sql', import.meta.url);

test('drilling maintenance task is suppressed when canonical maintenance review exists', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /operational_tasks_by_cargo_v8/);
  assert.match(sql, /task_key like 'drilling_maintenance:%'/);
  assert.match(sql, /operational_maintenance_reviews/);
  assert.match(sql, /source_report_id::text=split_part\(t\.task_key,':',2\)/);
  assert.match(sql, /r\.status='pending'/);
  assert.match(sql, /from public\.operational_tasks_by_cargo_v8 t/);
});
