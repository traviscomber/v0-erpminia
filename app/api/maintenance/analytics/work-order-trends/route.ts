import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const orgId = req.headers.get('x-org-id') || '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';

  try {
    // Get work orders for last 30 days grouped by day and type
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: workOrders } = await sb
      .from('maintenance_work_orders')
      .select('id, created_at, work_type, status')
      .eq('organization_id', orgId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Group by date
    const dateMap = new Map();
    const typeMap = new Map();

    workOrders?.forEach((wo) => {
      const date = new Date(wo.created_at).toISOString().split('T')[0]; // YYYY-MM-DD

      if (!dateMap.has(date)) {
        dateMap.set(date, { date, created: 0, completed: 0 });
      }
      const dayData = dateMap.get(date);
      dayData.created += 1;
      if (wo.status === 'completed') dayData.completed += 1;

      // Type aggregation
      if (!typeMap.has(wo.work_type)) {
        typeMap.set(wo.work_type, { type: wo.work_type, count: 0, completed: 0 });
      }
      const typeData = typeMap.get(wo.work_type);
      typeData.count += 1;
      if (wo.status === 'completed') typeData.completed += 1;
    });

    const dateData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const typeData = Array.from(typeMap.values());

    return NextResponse.json({
      data: {
        timeline: dateData,
        byType: typeData,
      },
    });
  } catch (error) {
    console.error('[v0] WO trends error:', error);
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
  }
}
