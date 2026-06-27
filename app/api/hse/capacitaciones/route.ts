export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';
import { getHseModuleData } from '@/lib/api/hse-data';

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const estado = request.nextUrl.searchParams.get('estado');
    const data = await getHseModuleData(context.organizationId, context.supabase);

    const capacitaciones = estado
      ? data.trainings.filter((training: any) => training.estado === estado)
      : data.trainings;

    return NextResponse.json({
      capacitaciones,
      total: capacitaciones.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch HSE trainings';
    console.error('[hse][capacitaciones] GET fallback:', message);
    return NextResponse.json({ capacitaciones: [], total: 0 });
  }
}
