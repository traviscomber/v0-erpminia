import { supabase } from '@/lib/db/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    const limit = searchParams.get('limit') || '50';

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, user:users(full_name)')
      .eq('inventory_item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Record movement
    const { data: moveData, error: moveError } = await supabase
      .from('stock_movements')
      .insert([body])
      .select()
      .single();

    if (moveError) throw moveError;

    // Update inventory item stock
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('id', body.inventory_item_id)
      .single();

    if (itemError) throw itemError;

    const newStock = item.current_stock + (body.movement_type === 'entrada' ? body.quantity : -body.quantity);
    
    await supabase
      .from('inventory_items')
      .update({ current_stock: newStock })
      .eq('id', body.inventory_item_id);

    return NextResponse.json(moveData, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
