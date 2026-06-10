import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authentication token' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
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

    // Verify user has uploader access to this module
    const { data: moduleAccess, error: accessError } = await supabase
      .from('user_module_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('module_id', module)
      .eq('status', 'active')
      .maybeSingle();

    if (accessError || !moduleAccess) {
      console.error('[v0] Upload access denied:', {
        userId: user.id,
        module,
      });
      return NextResponse.json(
        { error: `No tienes permiso para subir documentos en "${module}"` },
        { status: 403 }
      );
    }

    // Verify user has uploader or admin role
    if (!['uploader', 'admin'].includes(moduleAccess.role)) {
      return NextResponse.json(
        { error: 'No tienes rol de cargador en este módulo' },
        { status: 403 }
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
      console.error('[v0] Storage error:', uploadError);
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
          document_type_category: documentType,
          file_path: uploadData.path,
          file_size_bytes: file.size,
          file_url: publicUrlData.publicUrl,
          description,
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          status: 'draft',
          uploaded_by: user.id,
        },
      ])
      .select()
      .single();

    if (dbError) {
      // Si falla la BD, eliminar el archivo de storage
      await supabase.storage.from('documents').remove([uploadData.path]);

      console.error('[v0] Database error:', dbError);
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
    console.error('[v0] Upload error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
