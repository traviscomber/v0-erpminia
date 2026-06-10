import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const BUCKET = 'module-documents';
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const sanitize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9.\-]/gi, '_').toLowerCase();

// POST /api/carpeta-arranque/[id]/upload-doc
// FormData: file, slot_index
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id: carpetaId } = await params;
  const supabase = getSupabaseServerClient();

  // Verify carpeta exists
  const { data: carpeta, error: carpetaError } = await supabase
    .from('carpetas_arranque')
    .select('id, status, contacto_email, empresa_nombre')
    .eq('id', carpetaId)
    .single();

  if (carpetaError || !carpeta) {
    return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 });
  }

  if (['aprobado', 'en_revision_l1', 'en_revision_l2'].includes(carpeta.status)) {
    return NextResponse.json({ error: 'No se puede modificar una carpeta en revision o aprobada' }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const slotIndex = parseInt(formData.get('slot_index') as string, 10);

  if (!file || !slotIndex) {
    return NextResponse.json({ error: 'Archivo y slot_index son requeridos' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido. Use PDF, Word o Excel.' }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'El archivo supera el limite de 50MB' }, { status: 400 });
  }

  // Check existing slot to delete old file if replacing
  const { data: existingSlot } = await supabase
    .from('carpeta_documentos')
    .select('id, file_path')
    .eq('carpeta_id', carpetaId)
    .eq('slot_index', slotIndex)
    .maybeSingle();

  if (existingSlot?.file_path) {
    await supabase.storage.from(BUCKET).remove([existingSlot.file_path]);
  }

  const timestamp = Date.now();
  const filePath = `carpetas/${sanitize(carpetaId)}/${slotIndex}_${timestamp}_${sanitize(file.name)}`;

  const buffer = await file.arrayBuffer();
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: `Error al subir: ${uploadError.message}` }, { status: 500 });
  }

  // Update the document slot
  const { data: doc, error: docError } = await supabase
    .from('carpeta_documentos')
    .update({
      file_name: file.name,
      file_path: uploadData.path,
      file_size_bytes: file.size,
      uploaded_by: auth.user.id,
      uploaded_at: new Date().toISOString(),
      l1_status: null,
      l2_status: null,
      l1_observaciones: null,
      l2_observaciones: null,
      updated_at: new Date().toISOString(),
    })
    .eq('carpeta_id', carpetaId)
    .eq('slot_index', slotIndex)
    .select()
    .single();

  if (docError) {
    await supabase.storage.from(BUCKET).remove([uploadData.path]);
    return NextResponse.json({ error: docError.message }, { status: 500 });
  }

  return NextResponse.json({ document: doc, message: 'Documento cargado exitosamente' });
}
