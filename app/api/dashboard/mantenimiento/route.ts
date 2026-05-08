import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('maintenance_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error('[v0] Error fetching maintenance orders:', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // Calculate MTBF (Mean Time Between Failures)
    const { data: completedOrders } = await supabase
      .from('maintenance_orders')
      .select('actual_hours')
      .eq('status', 'completed')
      .not('actual_hours', 'is', null);

    const mtbf = completedOrders?.length ? 
      (completedOrders.reduce((sum: number, o: any) => sum + (o.actual_hours || 0), 0) / completedOrders.length) :
      0;

    return NextResponse.json({
      orders: orders || [],
      mtbf: Math.round(mtbf),
      total_count: orders?.length || 0,
    });
  } catch (err) {
    console.error('[v0] GET /api/dashboard/mantenimiento error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('maintenance_orders')
      .insert([body])
      .select();

    if (error) {
      console.error('[v0] Error creating maintenance order:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ order: data?.[0] }, { status: 201 });
  } catch (err) {
    console.error('[v0] POST /api/dashboard/mantenimiento error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, ...updates } = body;

    const { data, error } = await supabase
      .from('maintenance_orders')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[v0] Error updating maintenance order:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ order: data?.[0] });
  } catch (err) {
    console.error('[v0] PATCH /api/dashboard/mantenimiento error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
