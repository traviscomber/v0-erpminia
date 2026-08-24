export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { GET as getFinance } from '@/app/api/mi-finanzas/route';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getRoleKpiChange } from '@/lib/executive/role-kpi-change';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const response = await getFinance(request);
  if (!response.ok) return response;
  const data = await response.json();

  const change = await getRoleKpiChange({
    supabase: context.supabase,
    organizationId: context.organizationId,
    sourceView: 'admin_finance_role_kpi_snapshot_v1',
    cargoName: 'JEFE ADM.',
    kpiKeys: ['committed_cost_clp', 'recognized_cost_clp', 'cost_center_coverage', 'purchase_orders'],
  });

  return NextResponse.json({ ...data, change });
}
