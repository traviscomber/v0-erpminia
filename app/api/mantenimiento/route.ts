export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { mapMaintenanceWorkOrderToLegacy, normalizeMaintenanceStatus } from '@/lib/maintenance/work-order-compat';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const status = request.nextUrl.searchParams.get('status');
    const query = context.supabase
      .from('maintenance_work_orders')
      .select('*, asset:maintenance_assets(id, asset_name, asset_code, asset_type)')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false });

    if (status) {
      query.eq('status', normalizeMaintenanceStatus(status));
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ data: [], count: 0, warning: error.message });
    }

    const mapped = (data || []).map(mapMaintenanceWorkOrderToLegacy);
    return NextResponse.json({ data: mapped, count: mapped.length });
  } catch (error) {
    return NextResponse.json({ data: [], count: 0, warning: String(error) });
  }
}
