import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const { stock_id, quantity, reason, reference_doc, reference_id } = body;
    const { data: authData } = await context.supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current stock
    const { data: stock, error: stockError } = await context.supabase
      .from('warehouse_stock')
      .select('quantity_on_hand, quantity_reserved')
      .eq('id', stock_id)
      .eq('organization_id', context.organizationId)
      .single();

    if (stockError || !stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }

    // Log movement
    const { data: movement, error: moveError } = await context.supabase
      .from('stock_movements')
      .insert({
        stock_id,
        quantity,
        reason,
        movement_type: quantity < 0 ? 'issue' : 'receipt',
        reference_doc,
        reference_id,
        performed_by: userId,
        organization_id: context.organizationId,
      })
      .select()
      .single();

    if (moveError) throw moveError;

    // Update stock
    const newQuantity = Math.max(0, (stock.quantity_on_hand || 0) + quantity);
    const { error: updateError } = await context.supabase
      .from('warehouse_stock')
      .update({ quantity_on_hand: newQuantity, updated_at: new Date().toISOString() })
      .eq('id', stock_id);

    if (updateError) throw updateError;

    return NextResponse.json({ movement, new_quantity: newQuantity }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to log movement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
