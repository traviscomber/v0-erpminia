import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  try {
    const context = await getOrganizationContext(request);
    if (!context.ok) return context.response;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    // Get tires with optional status filter
    let query = context.supabase
      .from('tire_master')
      .select('*')
      .eq('organization_id', context.organizationId);

    if (status) {
      query = query.eq('current_lifecycle_status', status);
    }

    const { data: tires, error: tiresError } = await query;

    if (tiresError) throw tiresError;

    // Get events for each tire
    const tiresWithEvents = await Promise.all(
      (tires || []).map(async (tire) => {
        const { data: events } = await context.supabase
          .from('tire_events')
          .select('*')
          .eq('tire_id', tire.id)
          .order('event_timestamp', { ascending: false })
          .limit(10);

        return {
          ...tire,
          events: events || [],
        };
      })
    );

    // Calculate statistics
    const stats = {
      total: tires?.length || 0,
      in_stock: tires?.filter((t) => t.current_lifecycle_status === 'in_stock').length || 0,
      installed: tires?.filter((t) => t.current_lifecycle_status === 'installed').length || 0,
      in_repair: tires?.filter((t) => t.current_lifecycle_status === 'in_repair').length || 0,
      waiting_repair: tires?.filter((t) => t.current_lifecycle_status === 'waiting_repair').length || 0,
      average_repair_count: tires && tires.length > 0
        ? (tires.reduce((sum, t) => sum + (t.repair_count || 0), 0) / tires.length).toFixed(1)
        : 0,
    };

    return NextResponse.json({
      success: true,
      data: tiresWithEvents,
      stats,
    });
  } catch (error) {
    console.error('Error fetching tire dashboard:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error fetching dashboard data' },
      { status: 500 }
    );
  }
}
