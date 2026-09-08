export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { resolveAssistantContext } from '@/lib/intelligence/assistant-context';
import { routeOperationalQuery } from '@/lib/intelligence/query-router';

export async function POST(request: NextRequest) {
  const auth = await getOrganizationContext(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    const query = typeof body?.query === 'string' ? body.query : '';
    const pathname = typeof body?.context?.pathname === 'string' ? body.context.pathname : '';
    const resolvedContext = resolveAssistantContext(pathname);

    if (!query.trim()) {
      return NextResponse.json({ error: 'query es requerido' }, { status: 400 });
    }

    const route = routeOperationalQuery(query, { domain: resolvedContext.domain, pathname });

    return NextResponse.json({
      route,
      context: {
        domain: resolvedContext.domain,
        label: resolvedContext.label,
        title: resolvedContext.title,
      },
      policy: {
        fast: 'Usa primero el módulo actual o un único dominio canónico.',
        agentic: 'Amplía a capacidades de lectura sólo cuando la pregunta requiere correlación o causalidad.',
        action: 'Toda mutación requiere autorización explícita y controles del dominio antes de ejecutarse.',
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[intelligence/query-route]', error);
    return NextResponse.json({ error: 'No fue posible enrutar la consulta operacional' }, { status: 500 });
  }
}
