import { NextRequest, NextResponse } from 'next/server';
import { buildOrgSequence, getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('sostenibilidad_medio_ambiente')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('fecha', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los registros de medio ambiente';
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
      'sostenibilidad_medio_ambiente',
      context.organizationId,
      'MA'
    );

    const { data, error } = await context.supabase
      .from('sostenibilidad_medio_ambiente')
      .insert({
        organization_id: context.organizationId,
        numero_registro: numeroRegistro,
        fecha: new Date().toISOString().split('T')[0],
        tipo: body.tipo,
        descripcion: body.descripcion,
        valor: String(body.valor || ''),
        unidad: body.unidad,
        cumplimiento: body.cumplimiento || 'conforme',
        created_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el registro de medio ambiente';
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
      .from('sostenibilidad_medio_ambiente')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.organizationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el registro de medio ambiente';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

