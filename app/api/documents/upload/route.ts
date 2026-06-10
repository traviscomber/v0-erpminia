import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const module = formData.get('module') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const validFrom = formData.get('validFrom') as string;
    const validUntil = formData.get('validUntil') as string;

    if (!file || !module || !category) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido' },
        { status: 400 }
      );
    }

    // Validar tamaño
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo no debe superar 50MB' },
        { status: 400 }
      );
    }

    // Obtener extensión del archivo
    const ext = file.name.split('.').pop() || 'bin';
    const fileType = ext.toLowerCase();

    // Crear nombre único para el archivo
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const filePath = `module-documents/${module}/${category}/${timestamp}_${sanitizedName}`;

    // Subir a Supabase Storage
    const buffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Error al subir archivo: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(uploadData.path);

    // Crear registro en la base de datos
    const { data: document, error: dbError } = await supabase
      .from('module_documents')
      .insert([
        {
          module,
          category,
          document_name: file.name,
          document_type: fileType,
          file_path: uploadData.path,
          file_size_bytes: file.size,
          file_url: publicUrlData.publicUrl,
          description,
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          status: 'draft', // Por defecto en borrador para revisión
          uploaded_by: 'system', // TODO: Obtener del usuario autenticado
        },
      ])
      .select()
      .single();

    if (dbError) {
      // Si falla la BD, eliminar el archivo de storage
      await supabase.storage.from('documents').remove([uploadData.path]);

      return NextResponse.json(
        { error: `Error al crear registro: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documentId: document.id,
      fileName: file.name,
      fileUrl: publicUrlData.publicUrl,
      message: 'Documento cargado exitosamente',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
