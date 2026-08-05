export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const status = request.nextUrl.searchParams.get('status')?.trim();
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 100), 1), 500);

    let query = context.supabase
      .schema('intelligence')
      .from('work_order_flow')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('scheduled_date', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (status) query = query.eq('flow_status', status);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const overview = rows.reduce(
      (acc, row) => {
        acc.total += 1;
        acc[row.flow_status as keyof typeof acc] = (acc[row.flow_status as keyof typeof acc] || 0) + 1;
        acc.totalCost += Number(row.total_cost || 0);
        acc.purchaseCommitment += Number(row.purchase_commitment || 0);
        return acc;
      },
      {
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
      },
    );

    return NextResponse.json({ rows, overview, source: 'intelligence.work_order_flow' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el flujo de órdenes de trabajo';
    return NextResponse.json({ rows: [], error: message }, { status: 500 });
  }
}
