import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { v4 as uuid } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const context = await getOrganizationContext(request);
    if (!context.ok) return context.response;

    const body = await request.json();
    const { tire_code, tire_name, size, brand, model, condition, purchase_price, supplier, expected_lifespan_hours, current_location } = body;

    if (!tire_code || !tire_name) {
      return NextResponse.json(
        { error: 'tire_code and tire_name are required' },
        { status: 400 }
      );
    }

    // Create tire in tire_master
    const { data: tireData, error: tireError } = await context.supabase
      .from('tire_master')
      .insert({
        organization_id: context.organizationId,
        tire_code,
        tire_name,
        size,
        brand,
        model,
        condition: condition || 'new',
        purchase_price,
        supplier,
        expected_lifespan_hours,
        current_location: current_location || 'bodega',
        current_lifecycle_status: 'in_stock',
        repair_count: 0,
        total_hours_used: 0,
      })
      .select('*')
      .single();

    if (tireError) throw tireError;

    // Create initial event: "in_stock"
    const { error: eventError } = await context.supabase
      .from('tire_events')
      .insert({
        organization_id: context.organizationId,
        tire_id: tireData.id,
        event_type: 'in_stock',
        event_timestamp: new Date().toISOString(),
        created_by: 'bodega_entry_system',
        location: current_location || 'bodega',
        status_before: null,
        status_after: 'in_stock',
        notes: `Neumatico registrado en bodega: ${tire_name}`,
      });

    if (eventError) throw eventError;

    return NextResponse.json({
      success: true,
      tire: tireData,
      message: `Neumatico ${tire_code} registrado exitosamente`,
    });
  } catch (error) {
    console.error('Error registering tire:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error registering tire' },
      { status: 500 }
    );
  }
}
