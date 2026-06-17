export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// POST /api/sostenibilidad/ca/auto-create-from-nc
// Auto-genera acciones correctivas desde no conformidades aprobadas.
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { nc_id } = body;

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

    if (!['abierta', 'investigada', 'aprobada'].includes(ncData.status)) {
      return NextResponse.json(
        { error: 'NC status must be abierta, investigada, or aprobada' },
        { status: 400 }
      );
    }

    const { data: lastCA } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select('ca_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastNumber = lastCA?.ca_number ? parseInt(lastCA.ca_number.split('-')[2]) : 0;
    const newCANumber = `CA-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}-01`;
    const scheduledCompletionDate = calculateScheduledDate(ncData.severity);

    const { data: createdCA, error: caError } = await supabase
      .from('sostenibilidad_corrective_actions')
      .insert([
        {
          nc_id,
          ca_number: newCANumber,
          action_description: `Acción correctiva para: ${ncData.title}`,
          status: 'abierta',
          priority: ncData.severity === 'crítica' ? 'alta' : 'media',
          scheduled_completion_date: scheduledCompletionDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (caError) {
      console.error('Error creating CA:', caError);
      return NextResponse.json({ error: 'No se pudo crear la acción correctiva' }, { status: 500 });
    }

    await supabase.from('calendario_eventos_sostenibilidad').insert([
      {
        titulo: `Acción Correctiva: ${newCANumber}`,
        descripcion: `Acción para NC: ${ncData.nc_number} - ${ncData.title}`,
        tipo_evento: 'accion_correctiva',
        fecha_inicio: new Date().toISOString(),
        fecha_fin: new Date(scheduledCompletionDate).toISOString(),
        estado: 'activa',
        responsable: body.assigned_to || 'Por asignar',
        relacionado_modulo_tipo: 'corrective_action',
        relacionado_modulo_id: createdCA.id,
        created_at: new Date().toISOString(),
        created_by: body.created_by || null,
      },
    ]);

    await supabase
      .from('sostenibilidad_nonconformances')
      .update({ status: 'con_accion_asignada' })
      .eq('id', nc_id);

    await supabase.from('event_log').insert([
      {
        source_module: 'sostenibilidad',
        source_table: 'sostenibilidad_corrective_actions',
        source_id: createdCA.id,
        event_type: 'ca_auto_created_from_nc',
        payload: { nc_id, nc_number: ncData.nc_number, ca: createdCA },
        status: 'processed',
      },
    ]);

    return NextResponse.json(
      {
        success: true,
        created_ca: createdCA,
        nc_updated: true,
        message: `Acción Correctiva ${newCANumber} generada automáticamente`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error auto-creating CA:', error);
    return NextResponse.json(
      { error: 'No se pudo crear automáticamente la acción correctiva' },
      { status: 500 }
    );
  }
}

// Helper function para calcular fecha de ejecución basada en severidad
function calculateScheduledDate(severity: string): string {
  const date = new Date();
  switch (severity.toLowerCase()) {
    case 'crítica':
      date.setDate(date.getDate() + 3);
      break;
    case 'alta':
      date.setDate(date.getDate() + 7);
      break;
    case 'media':
      date.setDate(date.getDate() + 14);
      break;
    case 'baja':
      date.setDate(date.getDate() + 30);
      break;
    default:
      date.setDate(date.getDate() + 14);
  }

  return date.toLocaleDateString('en-CA');
}
