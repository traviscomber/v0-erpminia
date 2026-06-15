import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { titulo, tipo, gravedad, descripcion } = await request.json();

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('sostenibilidad_incidentes')
    .insert({ titulo, tipo, gravedad, descripcion, reportado_by: user.id })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ incident: data?.[0] }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get('mes');

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let query = supabase.from('sostenibilidad_incidentes').select('*');

  if (mes) {
    const [year, month] = mes.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
    query = query.gte('fecha_incidente', startDate).lte('fecha_incidente', endDate);
  }

  const { data, error } = await query.order('fecha_incidente', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stats = {
    total: data?.length || 0,
    lesiones: data?.filter((d: any) => d.gravedad === 'lesion_grave').length || 0,
    near_miss: data?.filter((d: any) => d.tipo === 'near_miss').length || 0,
  };

  return NextResponse.json({ incidents: data || [], stats });
}
