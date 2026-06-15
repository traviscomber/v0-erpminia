import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const departamento = searchParams.get('departamento');

    let query = supabase.from('finanzas_presupuestos').select('*');

    if (anio) query = query.eq('anio', parseInt(anio));
    if (mes) query = query.eq('mes', parseInt(mes));
    if (departamento) query = query.eq('departamento', departamento);

    const { data, error } = await query.order('mes', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ presupuestos: data || [] });
  } catch (error) {
    console.error('[v0] Error fetching presupuestos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch presupuestos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('finanzas_presupuestos')
      .insert([
        {
          anio: body.anio,
          mes: body.mes,
          departamento: body.departamento,
          concepto: body.concepto,
          monto_asignado: body.monto_asignado,
          estado: 'activo',
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ presupuesto: data?.[0] }, { status: 201 });
  } catch (error) {
    console.error('[v0] Error creating presupuesto:', error);
    return NextResponse.json({ error: 'Failed to create presupuesto' }, { status: 500 });
  }
}
