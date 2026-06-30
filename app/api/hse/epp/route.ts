export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';
import { getHseModuleData } from '@/lib/api/hse-data';

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const cargo = request.nextUrl.searchParams.get('cargo');
    const data = await getHseModuleData(context.organizationId, context.supabase);

    const entregas = cargo
      ? data.epp.filter((item) =>
          String(item.cargo || item.cargo_puesto || '')
            .toLowerCase()
            .includes(cargo.toLowerCase())
        )
      : data.epp;

    return NextResponse.json({
      entregas,
      total: entregas.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los datos de EPP';
    console.error('[hse][epp] GET fallback:', message);
    return NextResponse.json({ entregas: [], total: 0 });
  }
}
