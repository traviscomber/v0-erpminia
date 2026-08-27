import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const resolution = fs.readFileSync('supabase/migrations/20260827205000_resolve_supplier_returns_and_close_orders_v1.sql','utf8');
const received = fs.readFileSync('supabase/migrations/20260827205500_mark_supplier_return_received_v1.sql','utf8');
const route = fs.readFileSync('app/api/procurement/returns/route.ts','utf8');
const page = fs.readFileSync('app/dashboard/compras/devoluciones/page.tsx','utf8');

test('replacement resolution requires an accepted receipt covering the returned quantity',()=>{
  assert.match(resolution,/resolve_supplier_return_replacement_v1/);
  assert.match(resolution,/sum\(x\.quantity_accepted\)>=rl\.quantity/);
  assert.match(resolution,/La recepción de reposición no cubre toda la devolución/);
});

test('credit note reduces only unpaid accounts payable and preserves operational cost separation',()=>{
  assert.match(resolution,/procurement_supplier_credit_notes/);
  assert.match(resolution,/La nota de crédito supera el saldo pendiente/);
  assert.match(resolution,/approved_amount=approved_amount-p_amount/);
  assert.doesNotMatch(resolution,/procurement_operational_procurement_finance_ledger_v1\s+set/i);
});

test('order closes only when physical or commercial shortages and open returns are resolved',()=>{
  assert.match(resolution,/status='closed'/);
  assert.match(resolution,/status not in \('resolved','cancelled'\)/);
  assert.match(resolution,/resolution_type in \('credit_note','refund'\)/);
});

test('supplier receipt confirmation is an explicit server-only transition',()=>{
  assert.match(received,/status='received_by_supplier'/);
  assert.match(received,/where id=p_return_id and organization_id=p_organization_id and status='sent'/);
  assert.match(received,/grant execute on function public\.mark_supplier_return_received_v1.*service_role/);
});

test('returns API exposes explicit received replacement and credit note actions tenant scoped',()=>{
  assert.match(route,/mark_received_by_supplier/);
  assert.match(route,/resolve_replacement/);
  assert.match(route,/resolve_credit_note/);
  assert.match(route,/p_organization_id: context\.organizationId/);
});

test('returns workspace exposes progressive resolution without browser prompts',()=>{
  assert.match(page,/Proveedor recibió/);
  assert.match(page,/Confirmar reposición/);
  assert.match(page,/Registrar nota de crédito/);
  assert.match(page,/Una OC sólo se cierra cuando la diferencia queda realmente resuelta/);
  assert.doesNotMatch(page,/window\.prompt/);
});
