export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { MODULE_DEFS } from '@/lib/api/module-defs';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const [{ data: cargos, error: cargosErr }, { data: matrix, error: matrixErr }] = await Promise.all([
    supabase.from('cargos').select('id, name, display_order').order('display_order'),
    supabase.from('role_matrix').select('cargo_id, module_key, access_level'),
  ]);

  if (cargosErr || matrixErr) {
    return NextResponse.json(
      { error: cargosErr?.message || matrixErr?.message || 'Error al cargar la matriz' },
      { status: 500 },
    );
  }

  return NextResponse.json({ cargos: cargos ?? [], matrix: matrix ?? [], modules: MODULE_DEFS });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: 'La edición directa de la matriz está deshabilitada. Crea una solicitud de cambio y completa las aprobaciones de Jefatura de Área y Gerencia.',
      code: 'DIRECT_ROLE_MATRIX_WRITE_DISABLED',
    },
    { status: 410 },
  );
}
