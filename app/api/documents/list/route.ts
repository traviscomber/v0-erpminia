import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const BUCKET = 'module-documents';

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'No autenticado. Inicia sesión nuevamente.' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const module = searchParams.get('module');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (!module) {
      return NextResponse.json(
        { error: 'El parámetro "module" es requerido' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('module_documents')
      .select('*')
      .eq('module', module)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

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
      console.error('[v0] Query error:', error);
      return NextResponse.json(
        { error: `Error al obtener documentos: ${error.message}` },
        { status: 500 }
      );
    }

    // Generate signed download URLs for the private bucket
    const documents = await Promise.all(
      (data || []).map(async (doc) => {
        let file_url: string | null = null;
        if (doc.file_path) {
          const { data: signed } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(doc.file_path, 60 * 60);
          file_url = signed?.signedUrl || null;
        }
        return { ...doc, file_url };
      })
    );

    return NextResponse.json(documents);
  } catch (error) {
    console.error('[v0] API error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
