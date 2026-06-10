import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { searchParams } = new URL(request.url);

    if (!documentId) {
      return NextResponse.json(
        { error: 'ID de documento requerido' },
        { status: 400 }
      );
    }

    // Obtener documento para conseguir file_path
    const { data: document, error: fetchError } = await supabase
      .from('module_documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Soft delete en BD
    const { error: deleteError } = await supabase
      .from('module_documents')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', documentId);

    if (deleteError) {
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
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
