export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const organizationId = context.organizationId;
    const [overview, assets, products, suppliers, costCenters, validation, recent, alerts, operationalProcurement, operationalEvents] = await Promise.all([
      context.supabase.from('canonical_finance_overview').select('*').eq('organization_id', organizationId).maybeSingle(),
      context.supabase.from('canonical_finance_assets').select('*').eq('organization_id', organizationId).order('recognized_clp', { ascending: false }).limit(10),
      context.supabase.from('canonical_finance_products').select('*').eq('organization_id', organizationId).order('committed_clp', { ascending: false }).limit(10),
      context.supabase.from('canonical_finance_suppliers').select('*').eq('organization_id', organizationId).order('committed_clp', { ascending: false }).limit(10),
      context.supabase.from('canonical_finance_cost_centers').select('*').eq('organization_id', organizationId).order('committed_clp', { ascending: false }).limit(10),
      context.supabase.from('latest_canonical_financial_validation').select('*').eq('organization_id', organizationId).maybeSingle(),
      context.supabase.from('canonical_finance_source_audit').select('event_id,event_at,recognition_status,source_table,source_record_id,amount,currency,description,cost_center_code,metadata').eq('organization_id', organizationId).order('event_at', { ascending: false }).limit(20),
      context.supabase.from('canonical_finance_alerts').select('*').eq('organization_id', organizationId).gt('exception_count', 0).order('severity', { ascending: true }),
      context.supabase.from('operational_procurement_finance_summary_v1').select('*').eq('organization_id', organizationId).maybeSingle(),
      context.supabase.from('operational_procurement_finance_ledger_v1').select('event_id,event_at,event_type,recognition_status,source_table,source_record_id,work_order_id,canonical_asset_id,canonical_product_id,supplier_id,cost_center_code,amount,currency,description,metadata').eq('organization_id', organizationId).order('event_at', { ascending: false }).limit(20),
    ]);

    const error = overview.error || assets.error || products.error || suppliers.error || costCenters.error || validation.error || recent.error || alerts.error || operationalProcurement.error || operationalEvents.error;
    if (error) throw error;

    return NextResponse.json({
      overview: overview.data || null,
      topAssets: assets.data || [],
      topProducts: products.data || [],
      topSuppliers: suppliers.data || [],
      topCostCenters: costCenters.data || [],
      validation: validation.data || null,
      recentEvents: recent.data || [],
      alerts: alerts.data || [],
      operationalProcurement: operationalProcurement.data || null,
      operationalProcurementEvents: operationalEvents.data || [],
      certification: {
        origin: 'CANONICAL+ERP',
        currency: 'CLP',
        sources: ['canonical.asset_costs', 'canonical.purchase_order_lines', 'public.procurement_operational_order_lines', 'public.procurement_operational_receipt_lines'],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el resumen financiero certificado';
    console.error('[finance/executive]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
