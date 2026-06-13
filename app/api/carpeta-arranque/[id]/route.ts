import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/carpeta-arranque/[id]  — full detail with all 19 document slots
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data: carpeta, error } = await supabase
    .from('carpetas_arranque')
    .select(`
      *,
      carpeta_documentos ( * )
    `)
    .eq('id', id)
    .order('slot_index', { referencedTable: 'carpeta_documentos', ascending: true })
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Normalise shape: expose documentos as top-level array for component convenience
  const { carpeta_documentos: documentos, ...rest } = carpeta as typeof carpeta & { carpeta_documentos: unknown[] };
  return NextResponse.json({ carpeta: rest, documentos });
}
