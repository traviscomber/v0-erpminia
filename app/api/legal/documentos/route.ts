import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export async function GET(request: NextRequest) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  let query = supabase
    .from('module_documents')
    .select('id, document_name, document_type, description, status, file_path, file_url, uploaded_at, uploaded_by')
    .eq('module', 'legal')
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false });

  if (search) {
    query = query.ilike('document_name', `%${search}%`);
  }
  if (category) {
    query = query.eq('document_type', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[legal/documentos GET]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Generate signed URLs for each document that has a file_path
  const documents = await Promise.all(
    (data || []).map(async (doc) => {
      let fileUrl: string | null = (doc as any).file_url ?? null;

      if (!fileUrl && doc.file_path) {
        const { data: signedData } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.file_path, 3600);
        fileUrl = signedData?.signedUrl ?? null;
      }

      return {
        id: doc.id,
        title: doc.document_name,
        description: doc.description || '',
        category: doc.document_type || 'legal',
        documentType: doc.document_type || 'legal',
        status: doc.status || 'active',
        fileUrl,
        filePath: doc.file_path,
        uploadedAt: doc.uploaded_at,
        uploadedBy: doc.uploaded_by,
      };
    })
  );

  return NextResponse.json({ documents, total: documents.length });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { title, category, documentType, description } = body;

  if (!title) {
    return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('module_documents')
    .insert({
      document_name: title,
      document_type: documentType || category || 'legal',
      module: 'legal',
      status: 'draft',
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: data }, { status: 201 });
}
