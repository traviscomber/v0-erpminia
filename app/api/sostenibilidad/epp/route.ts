import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('sostenibilidad_epp')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('cargo_puesto', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch EPP';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();

    const { data, error } = await context.supabase
      .from('sostenibilidad_epp')
      .insert({
        organization_id: context.organizationId,
        cargo_puesto: body.cargo_puesto,
        elemento_epp: body.elemento_epp,
        cantidad_elemento: Number(body.cantidad_elemento || 1),
        marca_modelo: body.marca_modelo || null,
        frecuencia_reemplazo: body.frecuencia_reemplazo || 'semestral',
        activo: body.activo !== false,
        created_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create EPP';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

