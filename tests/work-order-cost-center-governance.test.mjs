import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/maintenance/work-orders/[id]/route.ts', import.meta.url), 'utf8');

test('OT cost center changes are blocked while an operational order is open', () => {
  assert.match(route, /procurement_operational_orders/);
  assert.match(route, /\.in\('status', \['issued', 'partially_received'\]\)/);
  assert.match(route, /No se puede cambiar la imputación mientras exista una OC emitida o parcialmente recibida/);
});

test('unchanged cost center does not trigger the open-order blocker', () => {
  assert.match(route, /nextCostCenterId !== \(currentOrder\.cost_center_id \|\| null\)/);
});
