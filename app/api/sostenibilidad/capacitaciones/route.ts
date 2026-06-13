import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('sostenibilidad_capacitaciones')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('fecha_programada', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las capacitaciones';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();

    const { data, error } = await context.supabase
      .from('sostenibilidad_capacitaciones')
      .insert({
        organization_id: context.organizationId,
        nombre_capacitacion: body.nombre_capacitacion,
        tipo: body.tipo || 'ACHS',
        tema: body.tema,
        programa_hse: body.programa_hse,
        proveedor_instructor: body.proveedor_instructor,
        fecha_programada: body.fecha_programada,
        hora_inicio: body.hora_inicio || null,
        hora_termino: body.hora_termino || null,
        duracion_horas: Number(body.duracion_horas || 0),
        cantidad_asistentes: Number(body.cantidad_asistentes || 0),
        faenas_cargos: body.faenas_cargos || [],
        estado: body.estado || 'planificada',
        created_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la capacitacin';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = new URL(request.url);
    const capacitacionId = searchParams.get('id');

    if (!capacitacionId) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await context.supabase
      .from('sostenibilidad_capacitaciones')
      .delete()
      .eq('id', capacitacionId)
      .eq('organization_id', context.organizationId);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar la capacitacin';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

