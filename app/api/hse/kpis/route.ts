export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';
import { getHseModuleData } from '@/lib/api/hse-data';
import { requireModuleAccess, MODULE_KEYS } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  const access = await requireModuleAccess(request, MODULE_KEYS.HSE_KPLS, false);
  if (!access.authorized) return access.response;

  try {
    const data = await getHseModuleData(context.organizationId, context.supabase);

    return NextResponse.json({
      kpis: data.kpis,
      meta_iirl: 1,
      summary: data.summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los KPIs HSE';
    console.error('[hse][kpis] GET fallback:', message);
    return NextResponse.json({
      kpis: [],
      meta_iirl: 1,
      summary: {
        total_incidents: 0,
        total_trainings: 0,
        total_epp: 0,
        open_investigations: 0,
      },
    });
  }
}
