export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const status = searchParams.get('status');
    const q = searchParams.get('q')?.trim();

    let query = context.supabase
      .schema('intelligence')
      .from('cost_event_ledger')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('event_at', { ascending: false })
      .limit(250);

    if (origin && origin !== 'all') query = query.eq('origin', origin);
    if (status && status !== 'all') query = query.eq('recognition_status', status);
    if (q) query = query.or(`description.ilike.%${q}%,source_record_id.ilike.%${q}%,cost_center_code.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const overview = rows.reduce(
      (acc, row) => {
        const amount = Number(row.amount || 0);
        if (row.recognition_status === 'recognized') acc.recognized += amount;
        if (row.recognition_status === 'committed') acc.committed += amount;
        if (row.recognition_status === 'pending') acc.pending += amount;
        if (row.origin === 'CANONICAL') acc.canonicalRows += 1;
        if (row.origin === 'ERP') acc.erpRows += 1;
        return acc;
      },
      { recognized: 0, committed: 0, pending: 0, canonicalRows: 0, erpRows: 0 },
    );

    return NextResponse.json({ overview, events: rows, capped: rows.length === 250 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el libro de eventos';
    return NextResponse.json({ overview: {}, events: [], error: message }, { status: 500 });
  }
}
