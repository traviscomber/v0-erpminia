export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { routeOperationalQuery } from '@/lib/intelligence/query-router';

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json().catch(() => null);
    const query = typeof body?.query === 'string' ? body.query : '';

    if (!query.trim()) {
      return NextResponse.json({ error: 'query es requerido' }, { status: 400 });
    }

    const route = routeOperationalQuery(query);

    return NextResponse.json({
      route,
      policy: {
        fast: 'Consulta un solo dominio canónico.',
        agentic: 'Puede correlacionar varias capacidades de lectura; no autoriza escrituras.',
        action: 'Toda mutación requiere autorización explícita y controles del dominio antes de ejecutarse.',
      },
      organizationId: context.organizationId,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[intelligence/query-route]', error);
    return NextResponse.json({ error: 'No fue posible enrutar la consulta operacional' }, { status: 500 });
  }
}
