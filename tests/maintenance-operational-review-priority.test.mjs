import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('app/api/maintenance/control-center/route.ts','utf8');

test('out-of-service field observations outrank overdue preventive actions',()=>{
  assert.match(api,/priority: outOfService \? 5 : 15/);
  assert.match(api,/priority: 10/);
  assert.match(api,/actions\.sort\(\(a,b\) => a\.priority - b\.priority/);
});

test('field observations stay human-reviewed and preserve review evidence in OT creation',()=>{
  assert.match(api,/drilling_maintenance_review_queue_v1/);
  assert.match(api,/has_linked_work_order/);
  assert.match(api,/reviewPriority = outOfService \? 'critical' : 'high'/);
  assert.match(api,/ordenes-trabajo\/create\?reviewId=\$\{encodeURIComponent\(String\(row\.review_id\)\)\}&workType=corrective&priority=\$\{reviewPriority\}/);
  assert.doesNotMatch(api,/create_work_order_from_operational_review/);
});
