import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827181500_operational_procurement_three_way_match_v1.sql', 'utf8');
const route = fs.readFileSync('app/api/procurement/operational-pipeline/route.ts', 'utf8');

test('three-way match compares order, accepted receipt and supplier invoice', () => {
  assert.match(migration, /quantity_ordered/);
  assert.match(migration, /quantity_accepted/);
  assert.match(migration, /quantity_invoiced/);
  assert.match(migration, /price_mismatch/);
  assert.match(migration, /quantity_over_receipt/);
  assert.match(migration, /pending_receipt/);
});

test('invoice matching does not add invoice amounts to the finance recognition ledger', () => {
  assert.doesNotMatch(migration, /operational_procurement_finance_ledger_v1\s+as/i);
  assert.match(migration, /procurement_three_way_match_summary_v1/);
});

test('supplier invoice RPC is service-role only and tenant checked', () => {
  assert.match(migration, /current_application_user_id\(\)/);
  assert.match(migration, /revoke all on function public\.create_supplier_invoice_v1[\s\S]*authenticated/);
  assert.match(migration, /grant execute on function public\.create_supplier_invoice_v1[\s\S]*service_role/);
});

test('operational pipeline exposes invoice creation and deterministic match evidence', () => {
  assert.match(route, /create_supplier_invoice_v1/);
  assert.match(route, /refresh_supplier_invoice_match_v1/);
  assert.match(route, /procurement_three_way_match_summary_v1/);
  assert.match(route, /procurement_three_way_match_lines_v1/);
  assert.match(route, /invoiceMatchSummary/);
  assert.match(route, /invoiceMatchLines/);
});
