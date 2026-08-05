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
    const { data, error } = await context.supabase
      .schema('intelligence')
      .from('universal_entity_timeline')
      .select('event_id,event_at,origin,event_type,source_table,source_record_id,work_order_id,canonical_asset_id,canonical_product_id,supplier_id,amount,currency,description,metadata')
      .eq('organization_id', context.organizationId)
      .eq('entity_type', entity)
      .eq('entity_id', id)
      .order('event_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({
      entity,
      entityId: id,
      events: data || [],
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
