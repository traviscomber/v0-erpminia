import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827203500_supplier_invoice_rejection_and_correction_chain_v1.sql','utf8');
const route = fs.readFileSync('app/api/procurement/operational-pipeline/route.ts','utf8');

test('rejected supplier invoices keep audit evidence and release payment approval',()=>{
  assert.match(migration,/rejected_for_correction_by/);
  assert.match(migration,/rejected_for_correction_at/);
  assert.match(migration,/rejection_reason/);
  assert.match(migration,/status='rejected'/);
  assert.match(migration,/approved_for_payment_at is not null/);
  assert.match(migration,/La factura ya generó una cuenta por pagar/);
});

test('rejected exception decision formally rejects the whole invoice',()=>{
  assert.match(migration,/if p_decision='rejected'/);
  assert.match(migration,/reject_supplier_invoice_for_correction_v1\(v_invoice_id,p_notes\)/);
  assert.match(migration,/and invoice_id=v_invoice\.id/);
  assert.match(migration,/and status='open'/);
});

test('correction invoice is explicitly linked and cannot replace twice',()=>{
  assert.match(migration,/replaces_invoice_id/);
  assert.match(migration,/procurement_supplier_invoice_single_replacement_idx/);
  assert.match(migration,/create_supplier_invoice_correction_v1/);
  assert.match(migration,/La factura a corregir debe estar rechazada/);
  assert.match(migration,/ya tiene un documento de corrección/);
});

test('rejected invoice summary cannot become approvable again',()=>{
  assert.match(migration,/when i\.status='rejected' then 'rejected'/);
});

test('operational API auto-links only an unambiguous rejected correction',()=>{
  assert.match(route,/pendingCorrections\.length > 1/);
  assert.match(route,/seleccione explícitamente cuál reemplazar/);
  assert.match(route,/create_supplier_invoice_correction_v1/);
  assert.match(route,/correctionOfInvoiceId/);
  assert.match(route,/replaces_invoice_id/);
});

test('invoice API exposes correction audit fields tenant scoped',()=>{
  assert.match(route,/rejected_for_correction_at/);
  assert.match(route,/rejection_reason/);
  assert.match(route,/eq\('organization_id', context\.organizationId\)/);
});
