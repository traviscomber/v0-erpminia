import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthContext } from '@/lib/api/auth-session';

const BUCKET = 'module-documents';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  // Fetch the document
  const { data: doc, error } = await supabase
    .from('module_documents')
    .select('id, document_name, file_path, file_url, module')
    .eq('id', id)
    .eq('module', 'legal')
    .is('deleted_at', null)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
  }

  // Return existing file_url if already set
  if (doc.file_url) {
    return NextResponse.json({ url: doc.file_url });
  }

  // Generate signed URL from file_path
  if (!doc.file_path) {
    return NextResponse.json({ error: 'Archivo no disponible' }, { status: 404 });
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, 3600);

  if (signedError || !signedData?.signedUrl) {
    console.error('[legal/download]', signedError?.message);
    return NextResponse.json({ error: 'No se pudo generar el enlace de descarga' }, { status: 500 });
  }

  return NextResponse.json({ url: signedData.signedUrl, name: doc.document_name });
}
