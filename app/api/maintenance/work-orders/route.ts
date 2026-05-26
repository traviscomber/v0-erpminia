import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 });
    }

    // Fetch work orders
    const response = await fetch(
      `${url}/rest/v1/maintenance_orders?select=*`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ workOrders: [] });
    }

    const workOrders = await response.json();
    
    // Format for frontend
    const formatted = workOrders.map((wo: any) => ({
      id: wo.id,
      work_order_number: wo.order_number,
      title: wo.title,
      description: wo.description,
      status: wo.status,
      priority: wo.priority,
      technician_name: wo.technician_name,
      progress_percentage: wo.progress_percentage,
      estimated_hours: wo.estimated_hours,
      estimated_cost: wo.estimated_cost,
      scheduled_date: wo.scheduled_date,
    }));

    return NextResponse.json({ workOrders: formatted });
  } catch (error) {
    return NextResponse.json({ workOrders: [], error: String(error) }, { status: 500 });
  }
}
