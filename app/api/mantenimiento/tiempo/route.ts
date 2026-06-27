export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { otId, horasTrabajadas, descripcion } = await request.json();

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Registrar tiempo de trabajo
  const { data, error } = await supabase
    .from('mantenimiento_tiempo')
    .insert({
      ot_id: otId,
      technician_id: user.id,
      horas_trabajadas: horasTrabajadas,
      descripcion,
      fecha: new Date().toISOString().split('T')[0],
    })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ time_entry: data?.[0] }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const otId = searchParams.get('otId');

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!otId) {
    return NextResponse.json({ time_entries: [], total_horas: 0 });
  }

  const { data, error } = await supabase
    .from('mantenimiento_tiempo')
    .select('*, technician_id(email)')
    .eq('ot_id', otId)
    .order('fecha', { ascending: false });

  if (error) {
    return NextResponse.json({ time_entries: [], total_horas: 0, warning: error.message });
  }

  const totalHoras = data?.reduce((sum, entry) => sum + entry.horas_trabajadas, 0) || 0;

  return NextResponse.json({
    time_entries: data || [],
    total_horas: totalHoras,
  });
}
