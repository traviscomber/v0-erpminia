import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const cargo = request.nextUrl.searchParams.get('cargo');
    
    let query = supabase.from('hse_epp_entregas').select('*');
    if (cargo) query = query.eq('cargo', cargo);

    const { data, error } = await query.order('fecha_entrega', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ entregas: data || [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, error } = await supabase.from('hse_epp_entregas').insert([body]).select();
    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
