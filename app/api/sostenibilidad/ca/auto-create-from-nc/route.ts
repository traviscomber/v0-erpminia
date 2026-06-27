export const dynamic = 'force-dynamic';

import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const nc_id = body.nc_id || body.ncId;

    if (!nc_id) {
      return NextResponse.json({ error: 'Missing required field: nc_id' }, { status: 400 });
    }

    const { data: ncData, error: ncError } = await supabase
      .from('sostenibilidad_nonconformances')
      .select('*')
      .eq('id', nc_id)
      .single();

    if (ncError || !ncData) {
      return NextResponse.json({ error: 'No-Conformidad not found' }, { status: 404 });
    }

    const ncStatus = String(ncData.status || '').toLowerCase();
    const validStatuses = ['abierta', 'open', 'investigada', 'in_progress', 'aprobada', 'approved'];
    if (!validStatuses.includes(ncStatus)) {
      return NextResponse.json(
        { error: 'El estado de la NC debe ser abierta, investigada o aprobada' },
        { status: 400 }
      );
    }

    const { data: lastCA } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select('ca_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastNumber = lastCA?.ca_number ? parseInt(lastCA.ca_number.split('-')[2], 10) : 0;
    const newCANumber = `CA-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}-01`;
    const scheduledCompletionDate = calculateScheduledDate(String(ncData.severity || 'media'));

    const severity = String(ncData.severity || '').toLowerCase();
    const priority = severity === 'critical' || severity === 'crítica' ? 'alta' : 'media';

    const { data: createdCA, error: caError } = await supabase
      .from('sostenibilidad_corrective_actions')
      .insert([
        {
          nc_id,
          ca_number: newCANumber,
          action_description: `Accion correctiva para: ${ncData.title}`,
          status: 'abierta',
          priority,
          scheduled_completion_date: scheduledCompletionDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (caError) {
      console.error('Error creating CA:', caError);
      return NextResponse.json({ error: 'No se pudo crear la accion correctiva' }, { status: 500 });
    }

    await supabase
      .from('sostenibilidad_nonconformances')
      .update({ status: 'in_progress' })
      .eq('id', nc_id);

    return NextResponse.json(
      {
        success: true,
        created_ca: createdCA,
        nc_updated: true,
        message: `Accion Correctiva ${newCANumber} generada automaticamente`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error auto-creating CA:', error);
    return NextResponse.json(
      { error: 'No se pudo crear automaticamente la accion correctiva' },
      { status: 500 }
    );
  }
}

function calculateScheduledDate(severity: string): string {
  const date = new Date();
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'crítica':
      date.setDate(date.getDate() + 3);
      break;
    case 'high':
    case 'alta':
      date.setDate(date.getDate() + 7);
      break;
    case 'medium':
    case 'media':
      date.setDate(date.getDate() + 14);
      break;
    case 'low':
    case 'baja':
      date.setDate(date.getDate() + 30);
      break;
    default:
      date.setDate(date.getDate() + 14);
  }
  return date.toLocaleDateString('en-CA');
}
