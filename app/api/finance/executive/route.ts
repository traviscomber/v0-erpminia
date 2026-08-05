export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const intelligence = context.supabase.schema('intelligence');
    const organizationId = context.organizationId;

    const [overview, assets, products, suppliers, costCenters, validation, recent, alerts] = await Promise.all([
      intelligence.from('canonical_finance_overview').select('*').eq('organization_id', organizationId).maybeSingle(),
      intelligence.from('canonical_finance_assets').select('*').eq('organization_id', organizationId).order('recognized_clp', { ascending: false }).limit(10),
      intelligence.from('canonical_finance_products').select('*').eq('organization_id', organizationId).order('committed_clp', { ascending: false }).limit(10),
      intelligence.from('canonical_finance_suppliers').select('*').eq('organization_id', organizationId).order('committed_clp', { ascending: false }).limit(10),
      intelligence.from('canonical_finance_cost_centers').select('*').eq('organization_id', organizationId).order('committed_clp', { ascending: false }).limit(10),
      intelligence.from('latest_canonical_financial_validation').select('*').eq('organization_id', organizationId).maybeSingle(),
      intelligence.from('canonical_finance_source_audit').select('event_id,event_at,recognition_status,source_table,source_record_id,amount,currency,description,cost_center_code,metadata').eq('organization_id', organizationId).order('event_at', { ascending: false }).limit(20),
      intelligence.from('canonical_finance_alerts').select('*').eq('organization_id', organizationId).gt('exception_count', 0).order('severity', { ascending: true }),
    ]);

    const error = overview.error || assets.error || products.error || suppliers.error || costCenters.error || validation.error || recent.error || alerts.error;
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
      certification: {
        origin: 'CANONICAL',
        currency: 'CLP',
        sources: ['canonical.asset_costs', 'canonical.purchase_order_lines'],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el resumen financiero certificado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
