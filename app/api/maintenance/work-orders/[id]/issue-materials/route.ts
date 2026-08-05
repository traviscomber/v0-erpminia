export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { id } = await params;
    const { data, error } = await context.supabase.rpc('issue_available_materials_to_work_order', { p_work_order_id: id });
    if (error) throw error;
    return NextResponse.json(data || { work_order_id: id, lines_issued: 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron entregar los materiales disponibles';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
