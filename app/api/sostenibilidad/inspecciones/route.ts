import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

function resolveInspectionTable(tipo: string | null) {
  if (tipo === 'externas') return 'inspecciones_externas';
  return 'inspecciones_internas';
}

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const tipo = request.nextUrl.searchParams.get('tipo');
    const estado = request.nextUrl.searchParams.get('estado');
    const table = resolveInspectionTable(tipo);

    let query = context.supabase
      .from(table)
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('fecha_planificada', { ascending: false });

    if (estado) query = query.eq('estado', estado);

    const { data, error } = await query;
    
    if (error) {
      console.error('[v0] Error fetching inspecciones:', error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('[v0] Error in inspecciones GET:', error);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const table = resolveInspectionTable(body.tipo);

    const payload: Record<string, unknown> = {
      organization_id: context.organizationId,
      numero_inspeccion: body.numero_inspeccion,
      fecha_planificada: body.fecha_planificada,
      fecha_realizada: body.estado === 'realizada' ? body.fecha_planificada : null,
      faena: body.faena,
      inspector: body.inspector,
      hallazgos_count: Number(body.hallazgos_count || 0),
      estado: body.estado || 'planificada',
      created_by: context.userId,
      updated_at: new Date().toISOString(),
    };

    if (table === 'inspecciones_externas') {
      payload.empresa_externa = body.empresa_externa;
      payload.contacto_externo = body.contacto_externo;
    }

    const { data, error } = await context.supabase
      .from(table)
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la inspeccin';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const table = resolveInspectionTable(body.tipo);

    const payload: Record<string, unknown> = {
      fecha_planificada: body.fecha_planificada,
      fecha_realizada:
        body.estado === 'realizada' ? body.fecha_realizada || body.fecha_planificada : null,
      faena: body.faena,
      inspector: body.inspector,
      hallazgos_count: Number(body.hallazgos_count || 0),
      estado: body.estado,
      updated_at: new Date().toISOString(),
    };

    if (table === 'inspecciones_externas') {
      payload.empresa_externa = body.empresa_externa;
      payload.contacto_externo = body.contacto_externo;
    }

    const { data, error } = await context.supabase
      .from(table)
      .update(payload)
      .eq('id', body.id)
      .eq('organization_id', context.organizationId)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar la inspeccin';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const id = request.nextUrl.searchParams.get('id');
    const tipo = request.nextUrl.searchParams.get('tipo');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await context.supabase
      .from(resolveInspectionTable(tipo))
      .delete()
      .eq('id', id)
      .eq('organization_id', context.organizationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar la inspeccin';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
