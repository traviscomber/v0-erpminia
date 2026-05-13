import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');

    let query = supabase
      .from('flujo_aprobacion_documentos_sostenibilidad')
      .select('*')
      .order('created_at', { ascending: false });

    if (estado) query = query.eq('estado', estado);

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('flujo_aprobacion_documentos_sostenibilidad')
      .insert([
        {
          documento_id: body.documento_id,
          documento_nombre: body.documento_nombre,
          version: body.version || 1,
          estado: 'borrador',
          creador_id: body.creador_id,
          creador_nombre: body.creador_nombre,
          archivo_url: body.archivo_url,
        }
      ])
      .select();

    if (error) throw error;

    // Log audit
    await supabase
      .from('auditoria_documentos_sostenibilidad')
      .insert({
        documento_id: body.documento_id,
        usuario_id: body.creador_id,
        usuario_nombre: body.creador_nombre,
        accion: 'creado',
      });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Update document status and validations
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, validador, accion, comentarios, ...updates } = body;

    // Update main document
    const updateData: any = { ...updates };

    if (validador === 1) {
      updateData.validador1_accion = accion;
      updateData.validador1_fecha_revision = new Date().toISOString();
      updateData.validador1_comentarios = comentarios;
      updateData.estado = accion === 'aprobado' ? 'pendiente_validador2' : 'cambios_solicitados_v1';
    } else if (validador === 2) {
      updateData.validador2_accion = accion;
      updateData.validador2_fecha_revision = new Date().toISOString();
      updateData.validador2_comentarios = comentarios;
      updateData.estado = accion === 'aprobado' ? 'aprobado_final' : 'cambios_solicitados_v2';
    }

    const { data, error } = await supabase
      .from('flujo_aprobacion_documentos_sostenibilidad')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    // Log audit
    await supabase
      .from('auditoria_documentos_sostenibilidad')
      .insert({
        documento_id: data[0].documento_id,
        usuario_id: body.usuario_id,
        usuario_nombre: body.usuario_nombre,
        accion: `${accion === 'aprobado' ? 'aprobado' : 'cambios'}_v${validador}`,
        cambios_detalle: { accion, comentarios },
      });

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
