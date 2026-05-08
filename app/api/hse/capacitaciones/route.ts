import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const estado = request.nextUrl.searchParams.get('estado');
    const faena = request.nextUrl.searchParams.get('faena');

    let query = supabase
      .from('hse_capacitaciones')
      .select('*, hse_capacitaciones_asistentes(*)');

    if (estado) {
      query = query.eq('estado', estado);
    }

    if (faena) {
      query = query.eq('faena', faena);
    }

    const { data, error } = await query.order('fecha_programada', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ capacitaciones: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('hse_capacitaciones')
      .insert([body])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
