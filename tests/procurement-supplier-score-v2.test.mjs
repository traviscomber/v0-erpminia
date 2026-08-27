import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827205500_supplier_operational_score_v2.sql','utf8');
const route = fs.readFileSync('app/api/procurement/suppliers-360/route.ts','utf8');
const page = fs.readFileSync('app/dashboard/compras/proveedores-360/page.tsx','utf8');

test('supplier score v2 uses only objective operational evidence',()=>{
  assert.match(migration,/delivery_scored_orders/);
  assert.match(migration,/quantity_accepted/);
  assert.match(migration,/invoice_clean_match_count/);
  assert.match(migration,/operational_score/);
  assert.match(migration,/v2_equal_available_dimensions/);
});

test('supplier score does not invent zero when there is no evidence',()=>{
  assert.match(migration,/then null/);
  assert.match(page,/Sin evidencia/);
  assert.match(page,/Evidencia: \{Number\(detail\.performance\?\.evidence_dimensions \|\| 0\)\}\/3 dimensiones/);
});

test('supplier score facade is backend only and tenant scoped by API',()=>{
  assert.match(migration,/security_invoker=true/);
  assert.match(migration,/revoke all on public\.supplier_operational_score_v2 from public,anon,authenticated/);
  assert.match(migration,/grant select on public\.supplier_operational_score_v2 to service_role/);
  assert.match(route,/supplier_operational_score_v2/);
  assert.match(route,/\.eq\('organization_id', context\.organizationId\)/);
});

test('supplier 360 exposes explainable score dimensions instead of legacy score',()=>{
  assert.match(page,/Score operacional v2/);
  assert.match(page,/Entrega a tiempo/);
  assert.match(page,/Calidad de recepción/);
  assert.match(page,/Match de factura/);
  assert.match(route,/legacyPerformance/);
  assert.doesNotMatch(page,/performance_score/);
});
