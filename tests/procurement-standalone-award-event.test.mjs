import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const awardMigration = fs.readFileSync(
  'supabase/migrations/20260829024738_fix_standalone_procurement_award_event_v1.sql',
  'utf8',
);
const receiptMigration = fs.readFileSync(
  'supabase/migrations/20260829024902_fix_standalone_procurement_receipt_event_v1.sql',
  'utf8',
);

test('standalone procurement award does not write a work-order event without a work order', () => {
  assert.match(
    awardMigration,
    /if v_req\.work_order_id is not null then\s+insert into public\.work_order_events/s,
  );
  assert.match(awardMigration,/'purchase_order_issued'/);
});

test('standalone procurement receipt skips OT coverage and OT events but retains application actor', () => {
  assert.match(
    receiptMigration,
    /if v_order\.work_order_id is not null then\s+perform public\.recalculate_work_order_material_coverage[\s\S]*insert into public\.work_order_events/s,
  );
  assert.match(receiptMigration,/'purchase_received'/);
  assert.match(
    receiptMigration,
    /'operational_receipt',v_receipt_id,public\.current_application_user_id\(\),'Recepción de OC operativa'/,
  );
  assert.doesNotMatch(receiptMigration,/'operational_receipt',v_receipt_id,auth\.uid\(\)/);
});
