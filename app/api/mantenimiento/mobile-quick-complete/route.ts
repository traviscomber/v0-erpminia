export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type MobileCompletePayload = {
  workOrderId?: string;
  workOrderNumber?: string;
  photoUrl?: string;
  hodometerReading?: number | string;
  notes?: string;
  completedAt?: string;
};

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = (await request.json()) as MobileCompletePayload;

    let workOrderId = body.workOrderId;

    // Resolve work order ID if needed
    if (!workOrderId && body.workOrderNumber) {
      const { data: wo } = await context.supabase
        .from('maintenance_work_orders')
        .select('id')
        .eq('organization_id', context.organizationId)
        .eq('work_order_number', body.workOrderNumber)
        .maybeSingle();

      workOrderId = wo?.id;
    }

    if (!workOrderId) {
      return NextResponse.json(
        { error: 'Se requiere workOrderId o workOrderNumber' },
        { status: 400 }
      );
    }

    // Update work order status
    const { data: updatedWO, error: updateError } = await context.supabase
      .from('maintenance_work_orders')
      .update({
        status: 'completed',
        completion_date: body.completedAt || new Date().toISOString(),
        notes: body.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workOrderId)
      .select('id, work_order_number, title, status, completion_date')
      .single();

    if (updateError) throw updateError;

    // Fetch next available work order
    const { data: nextWO } = await context.supabase
      .from('maintenance_work_orders')
      .select('id, work_order_number, title, asset_id')
      .eq('organization_id', context.organizationId)
      .eq('status', 'open')
      .order('priority', { ascending: true })
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    return NextResponse.json(
      {
        success: true,
        completed: {
          id: updatedWO.id,
          work_order_number: updatedWO.work_order_number,
          title: updatedWO.title,
          status: updatedWO.status,
          completion_date: updatedWO.completion_date,
        },
        nextWorkOrder: nextWO
          ? {
              id: nextWO.id,
              work_order_number: nextWO.work_order_number,
              title: nextWO.title,
              assetId: nextWO.asset_id,
            }
          : null,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudo completar la orden de trabajo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
