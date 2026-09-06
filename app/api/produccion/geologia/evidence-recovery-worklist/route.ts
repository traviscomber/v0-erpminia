export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { buildEvidenceRecoveryWorklist, parseRecoveryCategory } from '@/lib/geology-ai/evidence-recovery-worklist';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const category = parseRecoveryCategory(request.nextUrl.searchParams.get('category'));
    const data = await buildEvidenceRecoveryWorklist({
      supabase: context.supabase,
      organizationId: context.organizationId,
      category,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No fue posible cargar la bandeja de recuperación' },
      { status: 500 },
    );
  }
}
