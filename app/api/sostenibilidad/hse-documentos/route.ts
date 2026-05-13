import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET all HSE Master Documents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const estado = searchParams.get('estado');

    let query = supabase
      .from('hse_master_documents')
      .select('*')
      .order('fecha_actualizacion', { ascending: false });

    if (tipo) query = query.eq('tipo', tipo);
    if (estado) query = query.eq('estado', estado);

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST new HSE Document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('hse_master_documents')
      .insert([
        {
          nombre_documento: body.nombre_documento,
          tipo: body.tipo,
          version_actual: body.version_actual || '1.0',
          fecha_actualizacion: body.fecha_actualizacion || new Date().toISOString().split('T')[0],
          estado: body.estado || 'vigente',
          descripcion: body.descripcion,
          areas_aplica: body.areas_aplica || [],
          cargos_aplica: body.cargos_aplica || [],
          file_path: body.file_path,
          document_url: body.document_url,
          created_by: body.created_by,
        }
      ])
      .select();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update HSE Document
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    const { data, error } = await supabase
      .from('hse_master_documents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE HSE Document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const { error } = await supabase
      .from('hse_master_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ message: 'Document deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
