import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveAuthContext } from '@/app/auth-context';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || 'pendiente';

    const { data, error } = await supabase
      .from('finanzas_requisiciones')
      .select('*')
      .eq('estado', estado)
      .order('fecha_solicitud', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ requisiciones: data || [] });
  } catch (error) {
    console.error('[v0] Error fetching requisiciones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requisiciones' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request);
    if (!auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const numero_req = `REQ-${Date.now()}`;

    const { data, error } = await supabase
      .from('finanzas_requisiciones')
      .insert([
        {
          numero_req,
          departamento: body.departamento,
          descripcion: body.descripcion,
          monto_estimado: body.monto_estimado,
          estado: 'pendiente',
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ requisicion: data?.[0] }, { status: 201 });
  } catch (error) {
    console.error('[v0] Error creating requisicion:', error);
    return NextResponse.json({ error: 'Failed to create requisicion' }, { status: 500 });
  }
}
