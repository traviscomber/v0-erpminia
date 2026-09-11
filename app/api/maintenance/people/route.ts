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
      .select('id,full_name,email,role_title,employment_status,profile_id,supervisor_person_id')
      .eq('organization_id', context.organizationId)
      .eq('employment_status', 'active')
      .order('full_name');

    if (error) throw error;

    return NextResponse.json({
      people: data || [],
      canonical: true,
      source: 'public.people',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el personal de mantenimiento';
    console.error('[maintenance/people]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
