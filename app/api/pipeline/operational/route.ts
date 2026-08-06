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
      .from('operational_pipeline_guidance_v2')
      .select('intake_request_id,request_number,work_order_id,work_order_number,work_order_title,asset_code,asset_name,priority,required_date,current_stage:effective_stage,next_action:effective_next_action,next_action_href:effective_next_action_href,blockers:effective_blockers,progress_percent:effective_progress_percent,order_number,supplier_name,required_supplier_quotes,distinct_supplier_count,missing_supplier_quotes,uses_exception_policy,quotation_exception_type,quotation_exception_reason')
      .eq('organization_id', context.organizationId)
      .neq('effective_stage', 'Cerrado')
      .order('required_date', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (error) throw error;

    const normalizedData = (data || []).map(({ intake_request_id, ...item }) => ({
      ...item,
      pipeline_id: intake_request_id,
    }));

    return NextResponse.json({ data: normalizedData });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el pipeline operacional';
    return NextResponse.json({ error: message, data: [] }, { status: 500 });
  }
}
