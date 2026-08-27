import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = new URL('../supabase/migrations/20260827171000_require_cost_center_before_operational_award_v1.sql', import.meta.url);
const route = new URL('../app/api/procurement/operational-pipeline/route.ts', import.meta.url);

test('operational award requires a valid work order cost center', async () => {
  const sql = await readFile(migration, 'utf8');
  assert.match(sql, /v_work_order\.cost_center_id is null/);
  assert.match(sql, /Imputación contable pendiente/);
  assert.match(sql, /organization_id=v_req\.organization_id/);
  assert.match(sql, /coalesce\(status,'active'\) not in \('inactive','disabled','closed'\)/);
});

test('procurement pipeline exposes finance readiness before award', async () => {
  const source = await readFile(route, 'utf8');
  assert.match(source, /finance_ready: ready/);
  assert.match(source, /finance_blocker:/);
  assert.match(source, /cost_center_code:/);
  assert.match(source, /message\.startsWith\('Imputación contable'\) \? 409 : 500/);
});
