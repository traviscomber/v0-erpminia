import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Predefined system tags
const SYSTEM_TAGS = {
  'Tipo': ['Certificado', 'Reglamento', 'Procedimiento', 'Instructivo', 'Formulario', 'Guía', 'Estándar'],
  'Riesgo': ['Bajo', 'Medio', 'Alto', 'Crítico'],
  'Validez': ['Vigente', 'Próximo a Vencer', 'Vencido'],
  'Versión': ['v1.0', 'v1.1', 'v2.0', 'v2.1'],
  'Audiencia': ['Gerencia', 'Supervisores', 'Operarios', 'Todo el Personal'],
};

export async function GET(req: NextRequest) {
  try {
    const module = req.nextUrl.searchParams.get('module') || 'prevención';

    // Get unique tags from database
    const { data: docs, error } = await supabase
      .from('module_documents')
      .select('tags')
      .eq('module', module)
      .not('tags', 'is', null);

    if (error) throw error;

    // Aggregate tags
    const uniqueTags = new Set<string>();
    (docs || []).forEach((doc: any) => {
      if (Array.isArray(doc.tags)) {
        doc.tags.forEach((tag: string) => uniqueTags.add(tag));
      }
    });

    return NextResponse.json(
      {
        systemTags: SYSTEM_TAGS,
        userTags: Array.from(uniqueTags).sort(),
        module,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Get tags error:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
