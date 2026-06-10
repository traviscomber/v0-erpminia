import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const BUCKET = 'module-documents';

const allowedTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export async function POST(request: NextRequest) {
  try {
    // Authenticate using the app's custom cookie session
    const auth = await resolveAuthContext(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'No autenticado. Inicia sesión nuevamente.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const module = formData.get('module') as string;
    const category = formData.get('category') as string;
    const documentType = formData.get('documentType') as string;
    const description = formData.get('description') as string;
    const validFrom = formData.get('validFrom') as string;
    const validUntil = formData.get('validUntil') as string;

    if (!file || !module || !category) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido' },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo no debe superar 50MB' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    const ext = file.name.split('.').pop() || 'bin';
    const fileType = ext.toLowerCase();

    // Sanitize path segments: remove accents, then strip any char that isn't alphanumeric, dash or dot
    const sanitizePathSegment = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')   // strip diacritics (é → e, etc.)
        .replace(/[^a-z0-9.\-]/gi, '_')    // replace remaining special chars
        .toLowerCase();

    const timestamp = Date.now();
    const sanitizedModule   = sanitizePathSegment(module);
    const sanitizedCategory = sanitizePathSegment(category);
    const sanitizedName     = sanitizePathSegment(file.name);
    const filePath = `${sanitizedModule}/${sanitizedCategory}/${timestamp}_${sanitizedName}`;

    const buffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[v0] Storage error:', uploadError);
      return NextResponse.json(
        { error: `Error al subir archivo: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: document, error: dbError } = await supabase
      .from('module_documents')
      .insert([
        {
          module,
          category,
          document_name: file.name,
          document_type: fileType,
          document_type_category: documentType || null,
          file_path: uploadData.path,
          file_size_bytes: file.size,
          description: description || null,
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          status: 'draft',
          uploaded_by: auth.user.id,
        },
      ])
      .select()
      .single();

    if (dbError) {
      // Roll back the stored file if the DB insert fails
      await supabase.storage.from(BUCKET).remove([uploadData.path]);
      console.error('[v0] Database error:', dbError);
      return NextResponse.json(
        { error: `Error al crear registro: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documentId: document.id,
      fileName: file.name,
      message: 'Documento cargado exitosamente',
    });
  } catch (error) {
    console.error('[v0] Upload error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
