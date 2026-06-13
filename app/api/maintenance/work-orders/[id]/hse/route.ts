import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;

  try {
    // Get OT asset
    const { data: ot } = await context.supabase
      .from('maintenance_work_orders')
      .select('asset_id')
      .eq('id', id)
      .single();

    if (!ot) return NextResponse.json({ error: 'OT not found' }, { status: 404 });

    // Get HSE requirements for asset
    const { data: requirements } = await context.supabase
      .from('equipment_hse_requirements')
      .select('*')
      .eq('equipment_id', ot.asset_id)
      .single();

    return NextResponse.json({
      checklist: {
        ppe_required: requirements.ppe_required.split(',') || [],
        hazards: requirements.hazards.split(',') || [],
        training_required: requirements.training_required.split(',') || [],
        inspection_frequency: requirements.inspection_frequency,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load HSE checklist' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const { incident_type, severity, description, findings } = body;
    const { data: authData } = await context.supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get OT
    const { data: ot } = await context.supabase
      .from('maintenance_work_orders')
      .select('asset_id')
      .eq('id', id)
      .single();

    if (!ot) return NextResponse.json({ error: 'OT not found' }, { status: 404 });

    // Create incident
    const { data: incident, error } = await context.supabase
      .from('incidents')
      .insert({
        incident_type,
        severity,
        description,
        equipment_id: ot.asset_id,
        date_occurred: new Date().toISOString(),
        date_reported: new Date().toISOString(),
        status: 'open',
        reported_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    // Create investigation record
    if (findings) {
      await context.supabase.from('incident_investigations').insert({
        incident_id: incident.id,
        investigation_notes: findings,
        status: 'open',
        investigated_by: userId,
      });
    }

    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to log incident';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
