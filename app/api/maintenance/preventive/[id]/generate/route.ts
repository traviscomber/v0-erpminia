export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function POST(request: NextRequest, contextRoute: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { id } = await contextRoute.params;
    const body = await request.json().catch(() => ({}));
    const { data, error } = await context.supabase.rpc('create_work_order_from_schedule', {
      p_schedule_id: id,
      p_assigned_person_id: body?.assignedPersonId || null,
    });

    if (error) throw error;
    return NextResponse.json({ workOrderId: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo generar la orden desde el plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
