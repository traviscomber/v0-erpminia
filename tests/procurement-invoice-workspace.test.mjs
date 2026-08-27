import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/dashboard/compras/facturas/page.tsx', 'utf8');
const layout = fs.readFileSync('app/dashboard/compras/layout.tsx', 'utf8');

test('compras exposes a dedicated supplier invoice workspace', () => {
  assert.match(layout, /\/dashboard\/compras\/facturas/);
  assert.match(layout, /label: 'Facturas'/);
  assert.match(page, /OC · recepción · factura/);
});

test('invoice workspace uses operational API and renders honest empty states', () => {
  assert.match(page, /\/api\/procurement\/operational-pipeline/);
  assert.match(page, /Aún no existen OC operativas/);
  assert.match(page, /No hay facturas registradas para contrastar/);
});

test('invoice workspace creates supplier invoices and surfaces three-way evidence', () => {
  assert.match(page, /create_supplier_invoice/);
  assert.match(page, /refresh_supplier_invoice_match/);
  assert.match(page, /invoiceMatchSummary/);
  assert.match(page, /invoiceMatchLines/);
  assert.match(page, /quantity_accepted/);
  assert.match(page, /line_match_status/);
});

test('invoice workspace states that receipt owns operational cost recognition', () => {
  assert.match(page, /costo operacional[^.]*recepción/i);
  assert.match(page, /una sola vez en recepción|sin duplicar gasto/i);
});
