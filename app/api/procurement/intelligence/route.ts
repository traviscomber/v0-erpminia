export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const organizationId = context.organizationId;
    const intelligence = context.supabase.schema('intelligence');

    const [overviewResult, productsResult, suppliersResult, qualityResult, reconciliationResult] = await Promise.all([
      intelligence
        .from('procurement_overview')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle(),
      intelligence
        .from('product_procurement_status')
        .select('product_id, product_code, name, family, unit, standard_cost, has_purchase_history, purchase_order_count, supplier_count, total_quantity_purchased, total_spend, weighted_average_unit_cost, minimum_unit_cost, maximum_unit_cost, procurement_status, validation_status')
        .eq('organization_id', organizationId)
        .eq('has_purchase_history', true)
        .order('total_spend', { ascending: false })
        .limit(100),
      intelligence
        .from('supplier_performance')
        .select('supplier_id, tax_id, legal_name, trade_name, source_supplier_name, match_status, match_confidence, purchase_order_count, distinct_product_count, total_spend, average_order_value, first_purchase_date, last_purchase_date, warning_order_count')
        .eq('organization_id', organizationId)
        .order('total_spend', { ascending: false })
        .limit(100),
      intelligence
        .from('purchase_order_quality')
        .select('purchase_order_id, order_number, order_date, supplier_name, line_count, distinct_product_count, header_net_amount, calculated_line_net_amount, net_amount_variance, warning_line_count, quality_status')
        .eq('organization_id', organizationId)
        .neq('quality_status', 'valid')
        .order('order_date', { ascending: false })
        .limit(100),
      context.supabase
        .schema('canonical')
        .from('supplier_reconciliation')
        .select('id, source_supplier_name, normalized_supplier_key, canonical_supplier_id, match_status, match_confidence, match_notes')
        .eq('organization_id', organizationId)
        .eq('match_status', 'pending')
        .order('source_supplier_name')
        .limit(100),
    ]);

    const error = overviewResult.error || productsResult.error || suppliersResult.error || qualityResult.error || reconciliationResult.error;
    if (error) throw error;

    return NextResponse.json({
      overview: overviewResult.data || null,
      products: productsResult.data || [],
      suppliers: suppliersResult.data || [],
      qualityIssues: qualityResult.data || [],
      supplierReconciliation: reconciliationResult.data || [],
      source: 'intelligence',
      canonical: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la inteligencia de abastecimiento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
