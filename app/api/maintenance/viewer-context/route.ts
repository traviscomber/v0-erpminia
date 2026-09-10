export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const resolveMode = (cargoName: string | null) => {
  const cargo = String(cargoName || '').trim().toLowerCase();
  if (cargo === 'jefe departamento de mantenimiento') return 'leadership';
  if (cargo === 'jefe de planificación') return 'planning';
  if (cargo.startsWith('mecánico')) return 'execution';
  return 'general';
};

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: profile, error: profileError } = await context.supabase
      .from('profiles')
      .select('cargo_id')
      .eq('id', access.user.id)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
    if (profileError) throw profileError;

    let cargoName: string | null = null;
    if (profile?.cargo_id) {
      const { data: cargo, error: cargoError } = await context.supabase
        .from('cargos')
        .select('name')
        .eq('id', profile.cargo_id)
        .maybeSingle();
      if (cargoError) throw cargoError;
      cargoName = cargo?.name || null;
    }

    return NextResponse.json({
      mode: resolveMode(cargoName),
      cargoName,
      canEdit: access.canWrite,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo resolver el contexto de mantenimiento' }, { status: 500 });
  }
}
