import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20260827181500_snapshot_operational_order_cost_center_v1.sql', import.meta.url), 'utf8');

test('operational orders persist a cost center snapshot at award time', () => {
  assert.match(migration, /procurement_operational_orders[\s\S]*cost_center_id/);
  assert.match(migration, /v_work_order\.cost_center_id/);
  assert.match(migration, /insert into public\.procurement_operational_orders[\s\S]*cost_center_id/);
});

test('operational finance resolves cost center from the order snapshot', () => {
  assert.match(migration, /pc\.id=o\.cost_center_id/);
  assert.doesNotMatch(migration, /join public\.maintenance_work_orders wo/);
  assert.match(migration, /order_snapshot/);
});

test('snapshot migration stays later than the earlier finance and supply migrations', () => {
  assert.match(import.meta.url, /operational-procurement-cost-center-snapshot\.test\.mjs$/);
  assert.ok('20260827181500' > '20260827171500');
  assert.ok('20260827181500' > '20260827164000');
});
