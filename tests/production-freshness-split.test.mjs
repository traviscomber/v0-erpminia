import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../supabase/migrations/20260827095000_split_production_freshness_tasks_v1.sql', import.meta.url);
const inboxPath = new URL('../app/api/actions/inbox/route.ts', import.meta.url);

test('production freshness is split into independent source tasks', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /data_health:production:transport_freshness/);
  assert.match(sql, /data_health:production:plant_freshness/);
  assert.match(sql, /data_health:production:drilling_freshness/);
  assert.match(sql, /where pf\.transport_date is null or current_date-pf\.transport_date>7/);
  assert.match(sql, /where pf\.plant_date is null or current_date-pf\.plant_date>7/);
  assert.match(sql, /where pf\.drilling_date is null or current_date-pf\.drilling_date>7/);
  assert.match(sql, /where task_key <> 'data_health:production:freshness'/);
});

test('split production freshness tasks route to the correct existing workflows', async () => {
  const inbox = await readFile(inboxPath, 'utf8');
  assert.match(inbox, /transport_freshness'[\s\S]*importacion-maestra\?dataHealth=transport_freshness/);
  assert.match(inbox, /plant_freshness'[\s\S]*importacion-maestra\?dataHealth=plant_freshness/);
  assert.match(inbox, /drilling_freshness'[\s\S]*actualizar-fuentes\?source=drilling/);
});
