export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { requireModuleAccess, MODULE_KEYS } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const access = await requireModuleAccess(request, MODULE_KEYS.HSE_INVESTIGACIONES, false);
  if (!access.authorized) return access.response;

  try {
    const { data, error } = await context.supabase
      .from('hse_investigations')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ investigations: data || [] });
  } catch (error) {
    return NextResponse.json({ investigations: [], warning: (error as Error).message });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const access = await requireModuleAccess(request, MODULE_KEYS.HSE_INVESTIGACIONES, true);
  if (!access.authorized) return access.response;

  try {
    const { incident_id, root_cause, corrective_actions, assigned_to, target_date } = await request.json();

    const { data, error } = await context.supabase
      .from('hse_investigations')
      .insert([{
        organization_id: context.organizationId,
        incident_id,
        root_cause,
        corrective_actions,
        assigned_to,
        target_date,
        status: 'open',
        created_at: new Date().toISOString(),
      }])
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
