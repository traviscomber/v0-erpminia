import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const faena = request.nextUrl.searchParams.get('faena');
    const tipo = request.nextUrl.searchParams.get('tipo');

    let query = supabase
      .from('hse_documentos')
      .select('*, hse_documentos_aplicabilidad(*)')
      .eq('estado', 'vigente');

    if (faena) {
      query = query.eq('hse_documentos_aplicabilidad.faena', faena);
    }

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const { data, error } = await query.order('fecha_actualizacion', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ documentos: data || [] });
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
      .from('hse_documentos')
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
