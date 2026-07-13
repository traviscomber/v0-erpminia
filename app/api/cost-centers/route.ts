import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { isActiveCostCenterStatus } from '@/lib/cost-centers';

export const dynamic = 'force-dynamic';

type CostCenterRow = {
  id: string;
  code: string | null;
  name: string | null;
  description: string | null;
  status: string | null;
};

type CostCenterResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive';
};

export async function GET(request: NextRequest) {
  try {
    const context = await getOrganizationContext(request);
    if (!context.ok) return context.response;

    const { data: costCenters, error } = await context.supabase
      .from('cost_centers')
      .select('id, code, name, description, status')
      .eq('organization_id', context.organizationId)
      .order('code');

    if (error) {
      console.error('[API] Cost centers fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalized = (Array.isArray(costCenters) ? (costCenters as CostCenterRow[]) : [])
      .filter((center) => Boolean(center.id && center.code && center.name))
      .filter((center) => isActiveCostCenterStatus(center.status))
      .map<CostCenterResponse>((center) => ({
        id: center.id,
        code: String(center.code || '').trim(),
        name: String(center.name || '').trim(),
        description: center.description || null,
        status: 'active',
      }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
