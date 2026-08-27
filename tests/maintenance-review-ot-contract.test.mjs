import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const route = await readFile(new URL('../app/api/mining-os/maintenance-review-queue/route.ts', import.meta.url), 'utf8');
const inboxRoute = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');

test('review-to-OT API keeps legacy and RPC work-order identifiers/statuses compatible', () => {
  assert.match(route, /\.from\('maintenance_work_orders'\)/);
  assert.match(route, /work_order_id: authoritativeWorkOrder\.id/);
  assert.match(route, /work_order_status: authoritativeWorkOrder\.status/);
  assert.match(route, /id: rpcWorkOrder\.work_order_id/);
  assert.match(route, /status: rpcWorkOrder\.work_order_status/);
});

test('review-to-OT API preserves source review evidence in the response', () => {
  assert.match(route, /review_status: rpcWorkOrder\.review_status/);
  assert.match(route, /source_report_id: rpcWorkOrder\.source_report_id/);
});

test('role inbox sends maintenance reviews into the canonical review-to-OT flow', () => {
  assert.match(inboxRoute, /kind === 'maintenance_review'/);
  assert.match(inboxRoute, /ordenes-trabajo\/create\?reviewId=\$\{rawId\}&workType=corrective&priority=\$\{priority\}/);
});
