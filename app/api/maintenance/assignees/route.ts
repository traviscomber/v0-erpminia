export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('people')
      .select('id,full_name,role_title,employment_status')
      .eq('organization_id', context.organizationId)
      .eq('employment_status', 'active')
      .order('full_name');

    if (error) throw error;

    return NextResponse.json({
      assignees: (data || []).map((person) => ({
        id: person.id,
        name: person.full_name,
        roleTitle: person.role_title || null,
      })),
      canonical: true,
    });
  } catch (error) {
    console.error('[maintenance/assignees]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo cargar el personal disponible' },
      { status: 500 },
    );
  }
}
