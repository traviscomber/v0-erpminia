export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { buildInterpretationMatrix } from '@/lib/geology-ai/interpretation-matrix';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const holeId = request.nextUrl.searchParams.get('holeId');
    const matrix = await buildInterpretationMatrix({
      supabase: context.supabase,
      organizationId: context.organizationId,
      drillHoleId: holeId,
    });
    return NextResponse.json(matrix);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No fue posible cargar la matriz de interpretación' }, { status: 500 });
  }
}
