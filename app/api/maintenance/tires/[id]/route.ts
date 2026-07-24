import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getOrganizationContext(request);
    if (!context.ok) return context.response;

    const { id } = await params;

    // Get tire
    const { data: tire, error: tireError } = await context.supabase
      .from('tire_master')
      .select('*')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .single();

    if (tireError || !tire) {
      return NextResponse.json({ error: 'Tire not found' }, { status: 404 });
    }

    // Get all events
    const { data: events, error: eventsError } = await context.supabase
      .from('tire_events')
      .select('*')
      .eq('tire_id', id)
      .order('event_timestamp', { ascending: false });

    if (eventsError) throw eventsError;

    // Get all photos
    const { data: photos, error: photosError } = await context.supabase
      .from('tire_photos')
      .select('*')
      .in('tire_event_id', (events || []).map((e) => e.id));

    if (photosError) throw photosError;

    // Get work orders
    const { data: workOrders, error: woError } = await context.supabase
      .from('maintenance_work_orders')
      .select('*')
      .eq('work_type', 'neumatico_dañado')
      .order('created_at', { ascending: false });

    if (woError) throw woError;

    return NextResponse.json({
      success: true,
      tire,
      events: events || [],
      photos: photos || [],
      workOrders: workOrders || [],
    });
  } catch (error) {
    console.error('Error fetching tire details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error fetching tire details' },
      { status: 500 }
    );
  }
}
