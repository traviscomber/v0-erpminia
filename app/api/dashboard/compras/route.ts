import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Compras Module - Purchase Orders, Suppliers, Tracking
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('procurement_documents')
      .select('*, contractors(*)')
      .order('issue_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('[v0] Error fetching purchase orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate total amount
    const totalAmount = orders?.reduce((sum: number, o: any) => sum + (o.amount || 0), 0) || 0;

    return NextResponse.json({ 
      orders: orders || [],
      total_amount: totalAmount,
      total_count: orders?.length || 0,
    });
  } catch (err) {
    console.error('[v0] GET /api/dashboard/compras error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('procurement_documents')
      .insert([body])
      .select();

    if (error) {
      console.error('[v0] Error creating purchase order:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ order: data?.[0] }, { status: 201 });
  } catch (err) {
    console.error('[v0] POST /api/dashboard/compras error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
