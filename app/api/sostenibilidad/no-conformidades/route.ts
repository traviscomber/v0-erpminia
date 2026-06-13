import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/sostenibilidad/no-conformidades - Listar NCs con filtros avanzados
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const categoria = searchParams.get('categoria');
    const severidad = searchParams.get('severidad');
    const asignado_a = searchParams.get('asignado_a');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('sostenibilidad_nonconformances')
      .select('*', { count: 'exact' });

    if (estado) query = query.eq('status', estado);
    if (categoria) query = query.eq('category', categoria);
    if (severidad) query = query.eq('severity', severidad);
    if (asignado_a) query = query.eq('assigned_to', asignado_a);

    const { data, count, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: { total: count, limit, offset },
    });
  } catch (error) {
    console.error('Error fetching NCs:', error);
    return NextResponse.json(
      { error: 'No se pudieron cargar no-conformidades' },
      { status: 500 }
    );
  }
}

// POST /api/sostenibilidad/no-conformidades - Crear NC
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();

    const { data: createdNC, error } = await supabase
      .from('sostenibilidad_nonconformances')
      .insert([
        {
          ...body,
          created_at: new Date().toISOString(),
          status: 'abierta',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Log creation event
    await supabase.from('event_log').insert([
      {
        source_module: 'sostenibilidad',
        source_table: 'sostenibilidad_nonconformances',
        source_id: createdNC.id,
        event_type: 'nc_created',
        payload: createdNC,
        status: 'processed',
      },
    ]);

    return NextResponse.json(createdNC, { status: 201 });
  } catch (error) {
    console.error('Error creating NC:', error);
    return NextResponse.json(
      { error: 'No se pudo crear no-conformidad' },
      { status: 500 }
    );
  }
}
