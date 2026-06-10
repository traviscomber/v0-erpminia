import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filePath = formData.get('path') as string;
    const carpetaId = formData.get('carpetaId') as string;
    const documentType = formData.get('documentType') as string;

    if (!file || !filePath) {
      return NextResponse.json(
        { error: 'Archivo o ruta no proporcionados' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path);

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Save document record to database
    const { error: dbError } = await supabase
      .from('carpeta_arranque_documents')
      .insert({
        carpeta_id: carpetaId,
        document_type: documentType,
        file_name: file.name,
        file_path: data.path,
        file_url: publicUrlData.publicUrl,
        file_size_bytes: file.size,
        file_mime_type: file.type,
        uploaded_by: user.id,
        status: 'pending',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Error al guardar el documento en la base de datos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      fileUrl: publicUrlData.publicUrl,
      fileName: file.name,
      filePath: data.path,
      message: 'Documento cargado correctamente',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
