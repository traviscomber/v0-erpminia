export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';

type Overview = {
  total: number;
  planned: number;
  in_progress: number;
  waiting_procurement: number;
  waiting_parts: number;
  missing_asset: number;
  missing_person: number;
  completed: number;
  totalCost: number;
  purchaseCommitment: number;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const accessLevel = await getModuleAccessLevel(
      context.userId,
      context.role,
      MODULE_KEYS.MANT_OPERACIONES,
    );

    if (accessLevel !== 'LEC' && accessLevel !== 'ED') {
      return NextResponse.json(
        { error: 'Acceso a Mantención no autorizado para este usuario' },
        { status: 403 },
      );
    }

    const status = request.nextUrl.searchParams.get('status')?.trim();
    const includeLegacy = request.nextUrl.searchParams.get('includeLegacy') === 'true';
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 100), 1), 500);
    const sourceView = includeLegacy ? 'maintenance_work_order_flow_v1' : 'maintenance_operational_work_order_flow_v1';

    let query = context.supabase
      .from(sourceView)
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('scheduled_date', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (status) query = query.eq('flow_status', status);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const overview = rows.reduce<Overview>((acc, row) => {
      acc.total += 1;
      switch (row.flow_status) {
        case 'planned': acc.planned += 1; break;
        case 'in_progress': acc.in_progress += 1; break;
        case 'waiting_procurement': acc.waiting_procurement += 1; break;
        case 'waiting_parts': acc.waiting_parts += 1; break;
        case 'missing_asset': acc.missing_asset += 1; break;
        case 'missing_person': acc.missing_person += 1; break;
        case 'completed': acc.completed += 1; break;
      }
      acc.totalCost += Number(row.total_cost || 0);
      acc.purchaseCommitment += Number(row.purchase_commitment || 0);
      return acc;
    }, {
      total: 0,
      planned: 0,
      in_progress: 0,
      waiting_procurement: 0,
      waiting_parts: 0,
      missing_asset: 0,
      missing_person: 0,
      completed: 0,
      totalCost: 0,
      purchaseCommitment: 0,
    });

    return NextResponse.json({ rows, overview, legacyExcluded: !includeLegacy, source: `public.${sourceView}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el flujo de órdenes de trabajo';
    console.error('[maintenance/work-order-flow]', error);
    return NextResponse.json({ rows: [], error: message }, { status: 500 });
  }
}
