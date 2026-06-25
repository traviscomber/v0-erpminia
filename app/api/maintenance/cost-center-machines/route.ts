export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { deriveMachinesFromCostCenters } from '@/lib/maintenance/cost-center-machines';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: costCenters, error } = await context.supabase
      .from('cost_centers')
      .select('id, code, name, description, status')
      .eq('organization_id', context.organizationId)
      .order('code', { ascending: true });

    if (error) throw error;

    const machines = deriveMachinesFromCostCenters(costCenters || []);
    const families = new Set(machines.map((machine) => machine.family));

    return NextResponse.json({
      machines,
      summary: {
        total: machines.length,
        families: families.size,
        source: 'cost_centers',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron derivar las maquinas';
    return NextResponse.json({ machines: [], summary: { total: 0, families: 0, source: 'cost_centers' }, error: message }, { status: 500 });
  }
}
