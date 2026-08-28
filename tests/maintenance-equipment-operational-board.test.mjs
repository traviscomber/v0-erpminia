import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('equipment API composes operational evidence without inventing reliability', async () => {
  const source = await read('app/api/maintenance/equipment/route.ts');
  assert.match(source, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(source, /work_order_close_readiness_v2/);
  assert.match(source, /preventive_maintenance_hour_status_v1/);
  assert.match(source, /asset_runtime_summary_v1/);
  assert.match(source, /maintenance_reliability_by_asset_v1/);
  assert.match(source, /maintenance_runtime_reliability_by_asset_v1/);
  assert.match(source, /validMtbfIntervals/);
  assert.match(source, /nextAction/);
});

test('equipment board surfaces operational next action and honest MTBF state', async () => {
  const source = await read('components/maintenance/equipment-list.tsx');
  assert.match(source, /Flota|operationalLabel/);
  assert.match(source, /Preventivo vencido/);
  assert.match(source, /Con OT abierta/);
  assert.match(source, /Sin base MTBF/);
  assert.match(source, /nextActionHref/);
  assert.match(source, /Ficha 360/);
});
