import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import {
  mapMaintenanceWorkOrderToLegacy,
  normalizeMaintenancePriority,
  normalizeMaintenanceStatus,
} from '@/lib/maintenance/work-order-compat';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const status = request.nextUrl.searchParams.get('status');
    const priority = request.nextUrl.searchParams.get('priority');

    const query = context.supabase
      .from('maintenance_work_orders')
      .select('*, asset:maintenance_assets(id, asset_name, asset_code, asset_type)')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false });

    if (status) query.eq('status', normalizeMaintenanceStatus(status));
    if (priority) query.eq('priority', normalizeMaintenancePriority(priority));

    const { data, error } = await query;
    if (error) throw error;

    const mapped = (data || []).map(mapMaintenanceWorkOrderToLegacy);
    return NextResponse.json({ data: mapped, count: mapped.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch maintenance orders';
    return NextResponse.json({ error: message, data: [] }, { status: 500 });
  }
}
