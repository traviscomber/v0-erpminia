import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const module = searchParams.get('module');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('module_documents')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (module) {
      query = query.eq('module', module);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('document_name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Error al obtener documentos: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documents: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
