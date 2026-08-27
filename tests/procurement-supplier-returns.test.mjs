import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827204000_supplier_return_progression_v1.sql','utf8');
const route = fs.readFileSync('app/api/procurement/returns/route.ts','utf8');
const page = fs.readFileSync('app/dashboard/compras/devoluciones/page.tsx','utf8');
const layout = fs.readFileSync('app/dashboard/compras/layout.tsx','utf8');

test('supplier return only uses rejected quantity still pending',()=>{
  assert.match(migration,/quantity_rejected-coalesce\(x\.quantity_returned,0\)/);
  assert.match(migration,/La devolución excede la cantidad rechazada pendiente/);
  assert.match(migration,/sr\.status<>'cancelled'/);
});

test('sending a supplier return reopens the exact order quantity',()=>{
  assert.match(migration,/quantity_received=greatest\(quantity_received-v_qty,0\)/);
  assert.match(migration,/then 'partially_received' else 'received'/);
  assert.match(migration,/recalculate_work_order_material_coverage/);
});

test('supplier return remains distinct from financial settlement',()=>{
  assert.match(migration,/credit_note/);
  assert.match(migration,/['"]sent['"]/);
  assert.match(page,/nota de crédito.*separad/i);
});

test('supplier returns API is purchases-authorized and tenant scoped',()=>{
  assert.match(route,/MODULE_KEYS\.FIN_COMPRAS/);
  assert.match(route,/p_organization_id: context\.organizationId/);
  assert.match(route,/create_supplier_return_v1/);
  assert.match(migration,/revoke all on function public\.create_supplier_return_v1/);
});

test('returns workspace exposes one explicit next action and honest empty state',()=>{
  assert.match(page,/Siguiente acción/);
  assert.match(page,/Enviar devolución al proveedor/);
  assert.match(page,/No hay devoluciones ni cantidades rechazadas pendientes/);
  assert.match(layout,/\/dashboard\/compras\/devoluciones/);
});
