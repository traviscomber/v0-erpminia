export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type KpiRow = {
  organization_id: string;
  cargo_id: string;
  cargo_name: string;
  kpi_key: string;
  label: string;
  unit: string;
  measured_value: number | null;
  target_value?: number | null;
  direction: string;
  evaluation_state: string;
  measured_at: string;
  evidence?: Record<string, unknown> | null;
  domain?: string;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const cargo = request.nextUrl.searchParams.get('cargo');

  const [production, maintenance, hse, executive] = await Promise.all([
    context.supabase
      .from('role_operational_kpi_snapshot_v1')
      .select('*')
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('maintenance_role_kpi_snapshot_v1')
      .select('*')
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('hse_role_kpi_snapshot_v1')
      .select('*')
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('executive_operational_scorecard_v1')
      .select('*')
      .eq('organization_id', context.organizationId),
  ]);

  const error = production.error || maintenance.error || hse.error || executive.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: KpiRow[] = [
    ...((production.data || []) as KpiRow[]),
    ...((maintenance.data || []) as KpiRow[]),
    ...((hse.data || []) as KpiRow[]),
  ];
  const executiveRows = (executive.data || []) as KpiRow[];

  const filtered = cargo ? rows.filter((row) => row.cargo_name === cargo) : rows;
  const cargos = Array.from(new Set(rows.map((row) => row.cargo_name))).sort((a, b) => a.localeCompare(b, 'es'));

  return NextResponse.json({
    organizationId: context.organizationId,
    cargos,
    rows: filtered,
    executive: cargo && !['GERENTE', 'SUBGERENTE OP.', 'PRESIDENTE'].includes(cargo)
      ? []
      : cargo
        ? executiveRows.filter((row) => row.cargo_name === cargo)
        : executiveRows,
    meta: {
      mode: 'operational_baseline',
      personalEvaluation: false,
      targetsDefined: rows.some((row) => row.target_value !== null && row.target_value !== undefined),
      note: 'Los valores son baselines operacionales derivados de fuentes del sistema. No constituyen una evaluación personal mientras no existan metas aprobadas y atribución individual suficiente.',
    },
  });
}
