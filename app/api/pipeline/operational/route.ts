export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 100);

  try {
    const { data, error } = await context.supabase
      .schema('intelligence')
      .from('operational_pipeline_guidance')
      .select('pipeline_id,request_number,work_order_id,work_order_number,work_order_title,asset_code,asset_name,priority,required_date,current_stage,next_action,next_action_href,blockers,progress_percent,order_number,supplier_name')
      .eq('organization_id', context.organizationId)
      .neq('current_stage', 'Cerrado')
      .order('required_date', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el pipeline operacional';
    return NextResponse.json({ error: message, data: [] }, { status: 500 });
  }
}
