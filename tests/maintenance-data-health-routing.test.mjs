import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const inboxRoute = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');
const workOrdersPage = await readFile(new URL('../app/dashboard/mantenimiento/ordenes-trabajo/page.tsx', import.meta.url), 'utf8');

test('maintenance missing-asset data health opens the filtered work-order queue', () => {
  assert.match(inboxRoute, /data_health'.*maintenance.*missing_asset/s);
  assert.match(inboxRoute, /ordenes-trabajo\?dataHealth=missing_asset/);
});

test('work-order queue filters to operational orders without canonical assets when requested', () => {
  assert.match(workOrdersPage, /searchParams\.get\('dataHealth'\) === 'missing_asset'/);
  assert.match(workOrdersPage, /order\.record_scope !== 'historical'/);
  assert.match(workOrdersPage, /!missingAssetOnly \|\| !order\.asset_name/);
  assert.match(workOrdersPage, /Data Health · OT operacional sin activo canónico/);
  assert.match(workOrdersPage, /Sin activo/);
});
