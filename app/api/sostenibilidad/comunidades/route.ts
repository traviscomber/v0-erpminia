export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { buildOrgSequence, getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('sostenibilidad_comunidades')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('fecha', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los registros comunitarios';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const numeroRegistro = await buildOrgSequence(
      context.supabase,
      'sostenibilidad_comunidades',
      context.organizationId,
      'COM'
    );

    const { data, error } = await context.supabase
      .from('sostenibilidad_comunidades')
      .insert({
        organization_id:  context.organizationId,
        numero_registro:  numeroRegistro,
        fecha:  body.fecha || new Date().toISOString().split('T')[0],
        tipo:  body.tipo,
        descripcion:  body.descripcion,
        stakeholder:  body.stakeholder,
        estado:  body.estado || 'pendiente',
        tipo_stakeholder:  body.tipo_stakeholder || 'comunidad',
        ubicacion:  body.ubicacion || null,
        contacto_persona:  body.contacto_persona || null,
        contacto_email:  body.contacto_email || null,
        contacto_telefono:  body.contacto_telefono || null,
        impactado_por:  body.impactado_por || null,
        fecha_seguimiento:  body.fecha_seguimiento || null,
        responsable:  body.responsable || null,
        observaciones:  body.observaciones || null,
        prioridad:  body.prioridad || 'media',
        tipo_documento:  body.tipo_documento || null,
        created_by:  context.userId,
        updated_at:  new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el registro comunitario';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await context.supabase
      .from('sostenibilidad_comunidades')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.organizationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el registro comunitario';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

