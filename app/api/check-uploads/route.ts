import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // Get ALL documents first (no module filter) to see what we have
    const { data: allDocuments, error: allError } = await supabase
      .from('module_documents')
      .select('id, document_name, module, category, status, document_type_category, created_at')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('[v0] Error fetching all documents:', allError);
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    // Get unique modules from documents
    const uniqueModules = [...new Set(allDocuments.map((d) => d.module).filter(Boolean) || [])];

    // Count by module
    const byModule: Record<string, number> = {};
    const documentsByModule: Record<string, any[]> = {};
    
    allDocuments.forEach((doc) => {
      const mod = doc.module || 'sin_modulo';
      byModule[mod] = (byModule[mod] || 0) + 1;
      if (!documentsByModule[mod]) {
        documentsByModule[mod] = [];
      }
      documentsByModule[mod].push({
        name: doc.document_name,
        category: doc.category,
        type: doc.document_type_category,
        status: doc.status,
      });
    });

    // Status breakdown for all documents
    const statusBreakdown = {
      total: allDocuments.length || 0,
      draft: allDocuments.filter((d) => d.status === 'draft').length || 0,
      en_revision_l1: allDocuments.filter((d) => d.status === 'en_revision_l1').length || 0,
      en_revision_l2: allDocuments.filter((d) => d.status === 'en_revision_l2').length || 0,
      aprobado: allDocuments.filter((d) => d.status === 'aprobado').length || 0,
      rechazado: allDocuments.filter((d) => d.status === 'rechazado').length || 0,
    };

    return NextResponse.json({
      total_documents: allDocuments.length || 0,
      status_breakdown: statusBreakdown,
      documents_by_module: byModule,
      all_modules: uniqueModules,
      sample_documents: allDocuments.slice(0, 10).map((d) => ({
        name: d.document_name,
        module: d.module,
        status: d.status,
      })) || [],
    });
  } catch (error) {
    console.error('[v0] Check uploads error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
