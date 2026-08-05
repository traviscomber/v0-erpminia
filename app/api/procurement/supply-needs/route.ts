export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .schema('intelligence')
      .from('work_order_supply_status')
      .select('*')
      .eq('organization_id', context.organizationId)
      .in('supply_status', ['open', 'pending', 'ready_for_procurement'])
      .gt('shortage_lines', 0)
      .order('required_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return NextResponse.json({ needs: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las necesidades de abastecimiento';
    return NextResponse.json({ needs: [], error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = (await request.json()) as { supplyNeedId?: string };
    if (!body.supplyNeedId) {
      return NextResponse.json({ error: 'Falta la necesidad de abastecimiento' }, { status: 400 });
    }

    const { data: userData } = await context.supabase.auth.getUser();
    const requestedByName = userData.user?.user_metadata?.full_name
      || userData.user?.user_metadata?.name
      || userData.user?.email
      || null;

    const { data, error } = await context.supabase.rpc('convert_supply_need_to_intake_request', {
      p_supply_need_id: body.supplyNeedId,
      p_requested_by: context.userId,
      p_requested_by_name: requestedByName,
    });

    if (error) throw error;

    const { data: intake, error: intakeError } = await context.supabase
      .schema('intelligence')
      .from('procurement_intake_flow')
      .select('*')
      .eq('organization_id', context.organizationId)
      .eq('id', data)
      .single();

    if (intakeError) throw intakeError;

    return NextResponse.json({ intake }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la solicitud operativa';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
