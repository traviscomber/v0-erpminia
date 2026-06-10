import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;
  const { status, received_quantity } = await request.json();

  try {
    const updateData: any = {};
    if (status) updateData.status = status;
    if (received_quantity !== undefined) updateData.received_quantity = received_quantity;
    if (status === 'received') updateData.received_at = new Date().toISOString();

    const { data, error } = await context.supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
