import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function POST(request: NextRequest) {
  try {
    const context = await getOrganizationContext(request);
    if (!context.ok) return context.response;

    const body = await request.json();
    const { tire_id, equipment_code, location, description, damage_type, technician_name } = body;

    if (!tire_id) {
      return NextResponse.json({ error: 'tire_id is required' }, { status: 400 });
    }

    // Get tire data
    const { data: tire, error: tireError } = await context.supabase
      .from('tire_master')
      .select('*')
      .eq('id', tire_id)
      .single();

    if (tireError || !tire) {
      return NextResponse.json({ error: 'Tire not found' }, { status: 404 });
    }

    // Create damage report OT
    const woNumber = `WO-NEUMATICO-${Date.now()}`;
    const { data: woData, error: woError } = await context.supabase
      .from('maintenance_work_orders')
      .insert({
        organization_id: context.organizationId,
        work_order_number: woNumber,
        title: `Daño reportado: ${tire.tire_name} (${tire.tire_code})`,
        description: description || `Neumatico dañado en faena. ${damage_type || ''}`,
        work_type: 'neumatico_dañado',
        status: 'pending',
        priority: 'high',
        assigned_to_name: technician_name || 'Sin asignar',
        scheduled_date: new Date().toISOString().split('T')[0],
        planned_duration_hours: 2,
      })
      .select('*')
      .single();

    if (woError) throw woError;

    // Create damage_reported event
    const { error: eventError } = await context.supabase
      .from('tire_events')
      .insert({
        organization_id: context.organizationId,
        tire_id,
        work_order_id: woData.id,
        event_type: 'damage_reported',
        event_timestamp: new Date().toISOString(),
        created_by: technician_name || 'sistema',
        location,
        status_before: 'installed',
        status_after: 'waiting_repair',
        notes: description || 'Daño reportado en faena',
      });

    if (eventError) throw eventError;

    // Update tire status
    await context.supabase
      .from('tire_master')
      .update({
        current_lifecycle_status: 'waiting_repair',
        current_location: location,
        installed_on_equipment: null,
      })
      .eq('id', tire_id);

    return NextResponse.json({
      success: true,
      work_order: woData,
      tire: { ...tire, current_lifecycle_status: 'waiting_repair' },
      message: `OT-Neumatico ${woNumber} creada exitosamente`,
    });
  } catch (error) {
    console.error('Error creating damage WO:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error creating WO' },
      { status: 500 }
    );
  }
}
