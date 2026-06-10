import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { error: 'ID de documento requerido' },
        { status: 400 }
      );
    }

    // Obtener documento para conseguir file_path y verificar propiedad
    const { data: document, error: fetchError } = await supabase
      .from('module_documents')
      .select('file_path, module, uploaded_by')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Verify user owns the document
    if (document.uploaded_by !== user.id) {
      console.error('[v0] Delete permission denied:', {
        userId: user.id,
        documentOwner: document.uploaded_by,
        documentId,
      });
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este documento' },
        { status: 403 }
      );
    }

    // Verify user has access to this module
    const { data: moduleAccess, error: accessError } = await supabase
      .from('user_module_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('module_id', document.module)
      .eq('status', 'active')
      .maybeSingle();

    if (accessError || !moduleAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a este módulo' },
        { status: 403 }
      );
    }

    // Soft delete en BD
    const { error: deleteError } = await supabase
      .from('module_documents')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', documentId);

    if (deleteError) {
      console.error('[v0] Delete error:', deleteError);
      return NextResponse.json(
        { error: `Error al eliminar documento: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Eliminar de storage (opcional - comentado para retención)
    // await supabase.storage.from('documents').remove([document.file_path]);

    return NextResponse.json({
      message: 'Documento eliminado exitosamente',
      documentId,
    });
  } catch (error) {
    console.error('[v0] Delete error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
