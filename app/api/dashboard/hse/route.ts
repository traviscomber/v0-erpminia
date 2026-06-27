export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';
import { getHseModuleData } from '@/lib/api/hse-data';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const data = await getHseModuleData(context.organizationId, context.supabase);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch HSE dashboard data';
    console.error('[hse][dashboard] GET fallback:', message);
    return NextResponse.json({
      summary: {
        total_incidents: 0,
        total_trainings: 0,
        total_epp: 0,
        open_investigations: 0,
      },
      kpis: [],
      trainings: [],
      epp: [],
      incidents: [],
      meta_iirl: 1,
    });
  }
}
