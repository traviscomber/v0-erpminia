import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('sostenibilidad_kpis')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('mes_ano', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los KPIs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();

    const { data, error } = await context.supabase
      .from('sostenibilidad_kpis')
      .upsert(
        {
          organization_id: context.organizationId,
          mes_ano: body.mes_ano,
          tasa_accidentabilidad: Number(body.tasa_accidentabilidad || 0),
          tasa_frecuencia: Number(body.tasa_frecuencia || 0),
          tasa_gravedad: Number(body.tasa_gravedad || 0),
          dias_sin_accidentes: Number(body.dias_sin_accidentes || 0),
          created_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,mes_ano' }
      )
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo guardar el KPI';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

