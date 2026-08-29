import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  'supabase/migrations/20260829024738_fix_standalone_procurement_award_event_v1.sql',
  'utf8',
);

test('standalone procurement award does not write a work-order event without a work order', () => {
  assert.match(
    migration,
    /if v_req\.work_order_id is not null then\s+insert into public\.work_order_events/s,
  );
  assert.match(migration,/'purchase_order_issued'/);
  assert.doesNotMatch(
    migration,
    /insert into public\.work_order_events[\s\S]*case when v_req\.work_order_id is null then null/s,
  );
});
