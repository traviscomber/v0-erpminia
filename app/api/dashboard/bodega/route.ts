import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Bodega - Inventory FIFO + QR
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const stockStatus = searchParams.get('stock_status'); // 'critical', 'low', 'normal'

    let query = supabase
      .from('wear_parts')
      .select('*')
      .order('stock_current', { ascending: true });

    if (stockStatus === 'critical') {
      query = query.lte('stock_current', supabase.rpc('stock_min'));
    } else if (stockStatus === 'low') {
      query = query.lt('stock_current', supabase.rpc('stock_min')).gte('stock_current', 0);
    }

    const { data: inventory, error } = await query;

    if (error) {
      console.error('[v0] Error fetching inventory:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const criticalCount = inventory?.filter((item: any) => item.stock_current <= item.stock_min).length || 0;

    return NextResponse.json({ 
      inventory: inventory || [],
      critical_count: criticalCount,
      total_items: inventory?.length || 0,
    });
  } catch (err) {
    console.error('[v0] GET /api/dashboard/bodega error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, ...updates } = body;

    const { data, error } = await supabase
      .from('wear_parts')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[v0] Error updating inventory:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ item: data?.[0] });
  } catch (err) {
    console.error('[v0] PATCH /api/dashboard/bodega error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
