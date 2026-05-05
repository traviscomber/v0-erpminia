import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('maintenance_orders')
      .select('*, components(name), equipment(name, id)')
      .order('scheduled_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('[v0] Error fetching work orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (err) {
    console.error('[v0] GET /api/dashboard/work-orders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      console.error('[v0] Error creating work order:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ order: data?.[0] }, { status: 201 });
  } catch (err) {
    console.error('[v0] POST /api/dashboard/work-orders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
