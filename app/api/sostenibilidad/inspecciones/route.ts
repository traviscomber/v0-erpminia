import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/sostenibilidad/inspecciones - Listar inspecciones con filtros
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // 'internas', 'externas', 'hse'
    const estado = searchParams.get('estado');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query;

    if (tipo === 'externas') {
      query = supabase
        .from('inspecciones_externas')
        .select('*', { count: 'exact' });
    } else if (tipo === 'hse') {
      query = supabase
        .from('hse_inspections')
        .select('*', { count: 'exact' });
    } else {
      query = supabase
        .from('inspecciones_internas')
        .select('*', { count: 'exact' });
    }

    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data, count, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      pagination: { total: count || 0, limit, offset },
    });
  } catch (error) {
    console.error('Error fetching inspecciones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspecciones' },
      { status: 500 }
    );
  }
}

// POST /api/sostenibilidad/inspecciones - Crear inspección
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { tipo, ...data } = body;

    let table;
    if (tipo === 'externas') {
      table = 'inspecciones_externas';
    } else if (tipo === 'hse') {
      table = 'hse_inspections';
    } else {
      table = 'inspecciones_internas';
    }

    const { data: createdInspection, error } = await supabase
      .from(table)
      .insert([
        {
          ...data,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(createdInspection, { status: 201 });
  } catch (error) {
    console.error('Error creating inspección:', error);
    return NextResponse.json(
      { error: 'Failed to create inspección' },
      { status: 500 }
    );
  }
}
