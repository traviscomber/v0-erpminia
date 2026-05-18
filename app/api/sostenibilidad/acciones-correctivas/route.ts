import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/sostenibilidad/acciones-correctivas - Listar CAs con filtros
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const nc_id = searchParams.get('nc_id');
    const responsable = searchParams.get('responsable');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('sostenibilidad_corrective_actions')
      .select('*', { count: 'exact' });

    if (estado) query = query.eq('status', estado);
    if (nc_id) query = query.eq('nc_id', nc_id);
    if (responsable) query = query.eq('responsible_person', responsable);

    const { data, count, error } = await query
      .range(offset, offset + limit - 1)
      .order('scheduled_completion_date', { ascending: true });

    if (error) throw error;

    // Enriquecer con información de NC relacionada
    const enrichedData = await Promise.all(
      data.map(async (ca) => {
        const { data: ncData } = await supabase
          .from('sostenibilidad_nonconformances')
          .select('nc_number, title, severity')
          .eq('id', ca.nc_id)
          .single();

        return { ...ca, relacionado_nc: ncData };
      })
    );

    return NextResponse.json({
      data: enrichedData,
      pagination: { total: count, limit, offset },
    });
  } catch (error) {
    console.error('Error fetching CAs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch corrective actions' },
      { status: 500 }
    );
  }
}

// POST /api/sostenibilidad/acciones-correctivas - Crear CA
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { nc_id } = body;

    // Generar número de CA auto-incrementado
    const { data: lastCA } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select('ca_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastNumber = lastCA?.ca_number ? parseInt(lastCA.ca_number.split('-')[2]) : 0;
    const newCANumber = `CA-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;

    const { data: createdCA, error } = await supabase
      .from('sostenibilidad_corrective_actions')
      .insert([
        {
          ...body,
          ca_number: newCANumber,
          created_at: new Date().toISOString(),
          status: 'abierta',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Crear evento en calendario
    await supabase.from('calendario_eventos_sostenibilidad').insert([
      {
        titulo: `Acción Correctiva: ${newCANumber}`,
        descripcion: body.action_description,
        tipo_evento: 'accion_correctiva',
        fecha_inicio: new Date(body.scheduled_completion_date).toISOString(),
        fecha_fin: new Date(body.scheduled_completion_date).toISOString(),
        estado: 'pendiente',
        relacionado_modulo_tipo: 'corrective_action',
        relacionado_modulo_id: createdCA.id,
        created_at: new Date().toISOString(),
      },
    ]);

    // Log event
    await supabase.from('event_log').insert([
      {
        source_module: 'sostenibilidad',
        source_table: 'sostenibilidad_corrective_actions',
        source_id: createdCA.id,
        event_type: 'ca_created',
        payload: createdCA,
        status: 'processed',
      },
    ]);

    return NextResponse.json(createdCA, { status: 201 });
  } catch (error) {
    console.error('Error creating CA:', error);
    return NextResponse.json(
      { error: 'Failed to create corrective action' },
      { status: 500 }
    );
  }
}
