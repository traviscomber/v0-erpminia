import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthContext } from '@/lib/api/auth-session';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const auth = await resolveAuthContext(request);
  if (!auth) {
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

  const documents = await Promise.all(
    (data || []).map(async (doc) => {
      let fileUrl: string | null = doc.file_url ?? null;

      if (!fileUrl && doc.file_path) {
        const { data: signedData } = await supabase.storage
          .from('module-documents')
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
  const supabase = await createClient();

  const auth = await resolveAuthContext(request);
  if (!auth) {
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
      description: description || null,
      module: 'legal',
      status: 'draft',
      uploaded_by: auth.user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: data }, { status: 201 });
}
