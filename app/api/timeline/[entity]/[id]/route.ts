export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type RouteContext = { params: Promise<{ entity: string; id: string }> };

const allowedEntities = new Set(['asset', 'product', 'supplier', 'work_order']);

export async function GET(request: NextRequest, { params }: RouteContext) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { entity, id } = await params;
  if (!allowedEntities.has(entity)) {
    return NextResponse.json({ error: 'Entidad no soportada' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 30), 1), 100);

  try {
    const { data, error } = await context.supabase.rpc('get_entity_timeline_v1', {
      p_organization_id: context.organizationId,
      p_entity_type: entity,
      p_entity_id: id,
      p_limit: limit,
    });

    if (error) throw error;

    return NextResponse.json({
      entity,
      entityId: id,
      events: Array.isArray(data) ? data : [],
      certification: {
        canonicalDataIsReadOnly: true,
        operationalEventsAreDerived: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la línea de tiempo';
    return NextResponse.json({ error: message, events: [] }, { status: 500 });
  }
}
