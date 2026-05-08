import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const propiedad = request.nextUrl.searchParams.get('propiedad');
    const mes = request.nextUrl.searchParams.get('mes');

    let query = supabase.from('contratos_regalias').select('*');

    if (propiedad) query = query.eq('propiedad', parseInt(propiedad));
    if (mes) query = query.eq('mes_ano', mes);

    const { data, error } = await query.order('mes_ano', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ regalias: data || [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, error } = await supabase.from('contratos_regalias').insert([body]).select();
    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
