import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cumulative = fs.readFileSync('supabase/migrations/20260827194000_cumulative_supplier_invoice_match_v2.sql', 'utf8');
const ordered = fs.readFileSync('supabase/migrations/20260827194500_ordered_cumulative_supplier_invoice_match_v3.sql', 'utf8');
const api = fs.readFileSync('app/api/procurement/invoiceable-lines/route.ts', 'utf8');
const ui = fs.readFileSync('components/procurement/progressive-invoice-workflow.tsx', 'utf8');

test('three-way match includes prior and cumulative quantities', () => {
  assert.match(cumulative, /prior_invoiced_quantity/);
  assert.match(cumulative, /cumulative_invoiced_quantity/);
  assert.match(cumulative, /quantity_over_receipt/);
  assert.match(cumulative, /quantity_over_order/);
  assert.match(cumulative, /procurement_invoiceable_order_lines_v1/);
});

test('historical invoice evidence is not changed by later invoices', () => {
  assert.match(ordered, /invoice_per_order_line/);
  assert.match(ordered, /rows between unbounded preceding and 1 preceding/);
  assert.match(ordered, /order by invoice_created_at,invoice_id/);
  assert.match(ordered, /prior_invoiced_quantity/);
});

test('invoiceable balance is tenant scoped and backend only', () => {
  assert.match(cumulative, /security_invoker=true/);
  assert.match(cumulative, /revoke all on public\.procurement_invoiceable_order_lines_v1 from public,anon,authenticated/);
  assert.match(cumulative, /grant select on public\.procurement_invoiceable_order_lines_v1 to service_role/);
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.FIN_COMPRAS\)/);
  assert.match(api, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /\.gt\('quantity_invoiceable', 0\)/);
});

test('progressive invoice UI supports repeated partial invoices without overbilling', () => {
  assert.match(ui, /\/api\/procurement\/invoiceable-lines/);
  assert.match(ui, /quantity_invoiceable/);
  assert.match(ui, /Facturable ahora/);
  assert.match(ui, /ya facturado/);
  assert.match(ui, /facturación acumulada previa/);
  assert.match(ui, /no puede superar el saldo recibido y aún no facturado/);
  assert.match(ui, /America\/Santiago/);
});
