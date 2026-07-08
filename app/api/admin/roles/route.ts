export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { MODULE_KEYS } from '@/lib/api/module-access';

// Human-readable labels + grouping for the matrix editor UI.
export const MODULE_DEFS = [
  { key: MODULE_KEYS.HSE_KPLS, label: 'KPLS', group: 'HSEC' },
  { key: MODULE_KEYS.HSE_DOCUMENTACION, label: 'Documentación HSE', group: 'HSEC' },
  { key: MODULE_KEYS.HSE_EPP, label: 'EPP', group: 'HSEC' },
  { key: MODULE_KEYS.HSE_INCIDENTE, label: 'Incidentes', group: 'HSEC' },
  { key: MODULE_KEYS.HSE_RIESGOS, label: 'Riesgos', group: 'HSEC' },
  { key: MODULE_KEYS.HSE_INVESTIGACIONES, label: 'Investigaciones', group: 'HSEC' },
  { key: MODULE_KEYS.HSE_CAPACITACIONES, label: 'Capacitaciones', group: 'HSEC' },
  { key: MODULE_KEYS.CONTRATOS_SOLICITAR_LINK, label: 'Solicitar Link', group: 'Contratos' },
  { key: MODULE_KEYS.CONTRATOS_SUBIR_INFO, label: 'Subir Información', group: 'Contratos' },
  { key: MODULE_KEYS.CONTRATOS_APROBAR, label: 'Aprobar Documentación', group: 'Contratos' },
  { key: MODULE_KEYS.CONTRATOS_AUTORIZAR, label: 'Autorizar Empresa', group: 'Contratos' },
  { key: MODULE_KEYS.CONTRATOS_VISUALIZACION, label: 'Visualización', group: 'Contratos' },
];

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
