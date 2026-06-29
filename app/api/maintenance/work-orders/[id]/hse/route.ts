export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type WorkOrderAssetRow = {
  asset_id: string | null;
};

type EquipmentHseRequirementsRow = {
  ppe_required: string | null;
  hazards: string | null;
  training_required: string | null;
  inspection_frequency: string | number | null;
};

type HseIncidentPayload = {
  incident_type?: string;
  severity?: string;
  description?: string;
  findings?: string;
};

function toList(value: string | null | undefined) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;

  try {
    const { data: ot } = await context.supabase
      .from('maintenance_work_orders')
      .select('asset_id')
      .eq('id', id)
      .single();

    const typedOt = ot as WorkOrderAssetRow | null;
    if (!typedOt) return NextResponse.json({ error: 'No se encontró la OT' }, { status: 404 });

    const { data: requirements } = await context.supabase
      .from('equipment_hse_requirements')
      .select('*')
      .eq('equipment_id', typedOt.asset_id)
      .single();

    const typedRequirements = requirements as EquipmentHseRequirementsRow | null;

    return NextResponse.json({
      checklist: {
        ppe_required: toList(typedRequirements?.ppe_required),
        hazards: toList(typedRequirements?.hazards),
        training_required: toList(typedRequirements?.training_required),
        inspection_frequency: typedRequirements?.inspection_frequency || null,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'No se pudo cargar la lista HSE' }, { status: 500 });
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
    const body = (await request.json()) as HseIncidentPayload;
    const { incident_type, severity, description, findings } = body;
    const { data: authData } = await context.supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: ot } = await context.supabase
      .from('maintenance_work_orders')
      .select('asset_id')
      .eq('id', id)
      .single();

    const typedOt = ot as WorkOrderAssetRow | null;
    if (!typedOt) return NextResponse.json({ error: 'No se encontró la OT' }, { status: 404 });

    const { data: incident, error } = await context.supabase
      .from('incidents')
      .insert({
        incident_type,
        severity,
        description,
        equipment_id: typedOt.asset_id,
        date_occurred: new Date().toISOString(),
        date_reported: new Date().toISOString(),
        status: 'open',
        reported_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

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
    const message = error instanceof Error ? error.message : 'No se pudo registrar el incidente';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
