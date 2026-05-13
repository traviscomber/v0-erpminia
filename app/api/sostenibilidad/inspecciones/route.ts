import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // 'internas' or 'externas'

    let table = 'inspecciones_internas';
    if (tipo === 'externas') table = 'inspecciones_externas';

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('fecha_planificada', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, ...inspectionData } = body;

    const table = tipo === 'externas' ? 'inspecciones_externas' : 'inspecciones_internas';

    const { data, error } = await supabase
      .from(table)
      .insert([inspectionData])
      .select();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, tipo, ...updates } = body;

    const table = tipo === 'externas' ? 'inspecciones_externas' : 'inspecciones_internas';

    const { data, error } = await supabase
      .from(table)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tipo = searchParams.get('tipo');

    const table = tipo === 'externas' ? 'inspecciones_externas' : 'inspecciones_internas';

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
