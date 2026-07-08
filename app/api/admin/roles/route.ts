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

  const [{ data: cargos, error: cargosErr }, { data: matrix, error: matrixErr }] =
    await Promise.all([
      supabase.from('cargos').select('id, name, display_order').order('display_order'),
      supabase.from('role_matrix').select('cargo_id, module_key, access_level'),
    ]);

  if (cargosErr || matrixErr) {
    return NextResponse.json(
      { error: cargosErr?.message || matrixErr?.message || 'Error al cargar la matriz' },
      { status: 500 }
    );
  }

  return NextResponse.json({ cargos: cargos ?? [], matrix: matrix ?? [], modules: MODULE_DEFS });
}

// Update a single matrix cell (cargo x module -> access level)
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { cargoId?: string; moduleKey?: string; accessLevel?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { cargoId, moduleKey, accessLevel } = body;

  if (!cargoId || !moduleKey || !accessLevel) {
    return NextResponse.json(
      { error: 'cargoId, moduleKey y accessLevel son obligatorios' },
      { status: 400 }
    );
  }

  if (!['ED', 'LEC', 'SR'].includes(accessLevel)) {
    return NextResponse.json({ error: 'accessLevel inválido' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('role_matrix')
    .upsert(
      { cargo_id: cargoId, module_key: moduleKey, access_level: accessLevel, updated_at: new Date().toISOString() },
      { onConflict: 'cargo_id,module_key' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Acceso actualizado' });
}
