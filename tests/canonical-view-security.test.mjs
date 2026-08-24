import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../supabase/migrations/20260824030814_harden_canonical_public_views.sql',
  import.meta.url,
);

const protectedViews = [
  "canonical_clp_cost_ledger",
  "canonical_finance_alerts",
  "canonical_finance_assets",
  "canonical_finance_cost_centers",
  "canonical_finance_overview",
  "canonical_finance_products",
  "canonical_finance_source_audit",
  "canonical_finance_suppliers",
  "canonical_goods_receipts_v1",
  "canonical_inventory_current",
  "canonical_procurement_events_v1",
  "canonical_procurement_request_lines_v1",
  "canonical_procurement_requests_v1",
  "canonical_products_v1",
  "canonical_purchase_order_lines_v1",
  "canonical_purchase_orders_current",
  "canonical_purchase_orders_v1",
  "canonical_supplier_quotation_lines_v1",
  "canonical_supplier_quotations_v1",
  "canonical_suppliers_v1",
  "document_approvals_v1",
  "finance_overview",
  "inventory_intelligence_overview_v1",
  "inventory_intelligence_position_v1",
  "latest_canonical_financial_validation",
  "maintenance_canonical_assets_v1",
  "maintenance_operational_work_order_flow_v1",
  "maintenance_work_order_flow_v1",
  "operational_pipeline_guidance_v2",
  "operational_procurement_pipeline",
  "procurement_intake_flow",
  "procurement_overview",
  "product_procurement_status",
  "production_metallurgy_automatic_v1",
  "purchase_order_quality",
  "supplier_performance",
  "supplier_performance_v1",
  "supplier_reconciliation_v1"
];

test('canonical backend views are explicitly covered by the security migration', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.equal(new Set(protectedViews).size, 38);
  for (const view of protectedViews) {
    assert.ok(sql.includes(`'${view}'`), `${view} must be included`);
  }
});

test('migration enforces invoker security and removes client-role privileges', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /alter view public\.%I set \(security_invoker = true\)/i);
  assert.match(sql, /revoke all privileges on table public\.%I from anon, authenticated/i);
  assert.match(sql, /grant select on table public\.%I to service_role/i);
  assert.match(sql, /canonical public-view hardening verification failed/i);
});
