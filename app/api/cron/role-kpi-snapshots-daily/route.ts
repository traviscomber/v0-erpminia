import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const SOURCE_VIEWS = [
  'admin_finance_role_kpi_snapshot_v1',
  'contract_document_role_kpi_snapshot_v1',
  'drilling_role_kpi_snapshot_v1',
  'hse_role_kpi_snapshot_v1',
  'inventory_geology_role_kpi_snapshot_v1',
  'maintenance_role_kpi_snapshot_v1',
] as const;

async function capture(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const snapshotDate = new Date().toISOString().slice(0, 10);
  const results: Array<{ source: string; rows: number }> = [];

  for (const sourceView of SOURCE_VIEWS) {
    const { data, error } = await supabase
      .from(sourceView)
      .select('organization_id,cargo_id,cargo_name,kpi_key,label,unit,measured_value,target_value,direction,evaluation_state,evidence');

    if (error) {
      console.error(`[role-kpi-history] ${sourceView}:`, error.message);
      return NextResponse.json({ error: `No fue posible capturar ${sourceView}` }, { status: 500 });
    }

    const rows = (data || []).map((row) => ({
      snapshot_date: snapshotDate,
      source_view: sourceView,
      organization_id: row.organization_id,
      cargo_id: row.cargo_id,
      cargo_name: row.cargo_name,
      kpi_key: row.kpi_key,
      label: row.label,
      unit: row.unit,
      measured_value: row.measured_value,
      target_value: row.target_value,
      direction: row.direction,
      evaluation_state: row.evaluation_state,
      evidence: row.evidence || {},
    }));

    if (rows.length) {
      const { error: upsertError } = await supabase
        .from('role_kpi_snapshot_history')
        .upsert(rows, {
          onConflict: 'snapshot_date,source_view,organization_id,cargo_id,kpi_key',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error(`[role-kpi-history] persist ${sourceView}:`, upsertError.message);
        return NextResponse.json({ error: `No fue posible persistir ${sourceView}` }, { status: 500 });
      }
    }

    results.push({ source: sourceView, rows: rows.length });
  }

  return NextResponse.json({ ok: true, snapshotDate, sources: results });
}

export async function GET(request: NextRequest) {
  return capture(request);
}

export async function POST(request: NextRequest) {
  return capture(request);
}
