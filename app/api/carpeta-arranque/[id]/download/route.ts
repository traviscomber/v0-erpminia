import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const BUCKET = 'module-documents';

// GET /api/carpeta-arranque/[id]/download?slot=<slot_index>
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id: carpetaId } = await params;
  const slotIndex = parseInt(request.nextUrl.searchParams.get('slot') ?? '0', 10);

  if (!slotIndex) {
    return NextResponse.json({ error: 'slot es requerido' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: doc, error } = await supabase
    .from('carpeta_documentos')
    .select('file_path, file_name')
    .eq('carpeta_id', carpetaId)
    .eq('slot_index', slotIndex)
    .maybeSingle();

  if (error || !doc?.file_path) {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
  }

  const { data: signedData, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, 300); // 5-minute signed URL

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Error al generar URL de descarga' }, { status: 500 });
  }

  return NextResponse.json({ url: signedData.signedUrl, file_name: doc.file_name });
}
