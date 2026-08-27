import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827183549_gate_supplier_invoice_payment_by_three_way_match_v1.sql', 'utf8');
const route = fs.readFileSync('app/api/procurement/operational-pipeline/route.ts', 'utf8');
const page = fs.readFileSync('app/dashboard/compras/facturas/page.tsx', 'utf8');

test('supplier invoice payment is gated by match or accepted traceable exception', () => {
  assert.match(migration, /approve_supplier_invoice_for_payment_v1/);
  assert.match(migration, /v_match='matched'/);
  assert.match(migration, /v_open=0 and v_accepted>0 and v_rejected=0/);
  assert.match(migration, /approved_for_payment_by/);
  assert.match(migration, /approved_for_payment_at/);
  assert.match(migration, /approval_basis/);
});

test('invoice exceptions require notes and preserve resolver identity', () => {
  assert.match(migration, /resolve_procurement_match_exception_v1/);
  assert.match(migration, /Notas de resolución requeridas/);
  assert.match(migration, /resolved_by=public\.current_application_user_id\(\)/);
  assert.match(migration, /resolved_at=now\(\)/);
});

test('open procurement invoice exceptions feed finance alerts without fabricating amounts', () => {
  assert.match(migration, /procurement_finance_alerts_v1/);
  assert.match(migration, /e\.status='open'/);
  assert.match(migration, /canonical_finance_alerts/);
  assert.match(migration, /Facturas con diferencias de OC \/ recepción/);
});

test('invoice payment gate remains server-only', () => {
  assert.match(migration, /revoke all on function public\.approve_supplier_invoice_for_payment_v1\(uuid,text\) from public,anon,authenticated/);
  assert.match(migration, /grant execute on function public\.approve_supplier_invoice_for_payment_v1\(uuid,text\) to service_role/);
  assert.match(migration, /security_invoker=true/);
});

test('procurement API exposes exception resolution and payment approval', () => {
  assert.match(route, /procurement_match_exceptions/);
  assert.match(route, /resolve_supplier_invoice_exception/);
  assert.match(route, /approve_supplier_invoice_payment/);
  assert.match(route, /approve_supplier_invoice_for_payment_v1/);
});

test('supplier invoice workspace shows open exceptions and audited payment approval', () => {
  assert.match(page, /Excepciones abiertas/);
  assert.match(page, /Aprobar pago/);
  assert.match(page, /Aceptar excepción de pago/);
  assert.match(page, /Fundamento de la decisión/);
  assert.match(page, /Pago aprobado/);
});
