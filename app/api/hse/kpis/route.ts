export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';
import { getHseModuleData } from '@/lib/api/hse-data';

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const data = await getHseModuleData(context.organizationId, context.supabase);

    return NextResponse.json({
      kpis: data.kpis,
      meta_iirl: 1,
      summary: data.summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los KPIs HSE';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
