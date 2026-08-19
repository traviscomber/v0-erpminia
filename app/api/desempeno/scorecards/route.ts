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

function withDomain(rows: KpiRow[], domain: string) {
  return rows.map((row) => ({ ...row, domain: row.domain || domain }));
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const cargo = request.nextUrl.searchParams.get('cargo');

  const [
    production,
    maintenance,
    hse,
    inventoryGeology,
    adminFinance,
    contractsDocuments,
    executive,
  ] = await Promise.all([
    context.supabase.from('role_operational_kpi_snapshot_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('maintenance_role_kpi_snapshot_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('hse_role_kpi_snapshot_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('inventory_geology_role_kpi_snapshot_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('admin_finance_role_kpi_snapshot_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('contract_document_role_kpi_snapshot_v1').select('*').eq('organization_id', context.organizationId),
    context.supabase.from('executive_operational_scorecard_v1').select('*').eq('organization_id', context.organizationId),
  ]);

  const error =
    production.error ||
    maintenance.error ||
    hse.error ||
    inventoryGeology.error ||
    adminFinance.error ||
    contractsDocuments.error ||
    executive.error;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const productionRows = (production.data || []) as KpiRow[];
  const maintenanceRows = withDomain((maintenance.data || []) as KpiRow[], 'maintenance');
  const hseRows = withDomain((hse.data || []) as KpiRow[], 'hse');
  const inventoryGeologyRows = ((inventoryGeology.data || []) as KpiRow[]).map((row) => ({
    ...row,
    domain: row.cargo_name === 'JEFE BODEGA' ? 'inventory' : 'geology',
  }));
  const adminFinanceRows = ((adminFinance.data || []) as KpiRow[]).map((row) => ({
    ...row,
    domain: row.kpi_key.startsWith('purchase_') ? 'procurement' : 'finance',
  }));
  const contractDocumentRows = ((contractsDocuments.data || []) as KpiRow[]).map((row) => ({
    ...row,
    domain: row.kpi_key === 'expired_documents' ? 'documents' : 'contracts',
  }));

  const rows: KpiRow[] = [
    ...productionRows,
    ...maintenanceRows,
    ...hseRows,
    ...inventoryGeologyRows,
    ...adminFinanceRows,
    ...contractDocumentRows,
  ];

  const executiveRows = (executive.data || []) as KpiRow[];
  const filtered = cargo ? rows.filter((row) => row.cargo_name === cargo) : rows;
  const cargos = Array.from(new Set(rows.map((row) => row.cargo_name))).sort((a, b) => a.localeCompare(b, 'es'));

  return NextResponse.json({
    organizationId: context.organizationId,
    cargos,
    rows: filtered,
    executive:
      cargo && !['GERENTE', 'SUBGERENTE OP.', 'PRESIDENTE'].includes(cargo)
        ? []
        : cargo
          ? executiveRows.filter((row) => row.cargo_name === cargo)
          : executiveRows,
    evidenceGaps: [
      {
        domain: 'rrhh',
        status: 'insufficient_data',
        detail: 'Competencias, credenciales y evaluaciones de desempeño aún no tienen evidencia operacional suficiente.',
      },
      {
        domain: 'drilling',
        status: 'insufficient_data',
        detail: 'Campañas, sondajes e intervalos de perforación aún no tienen registros canónicos.',
      },
      {
        domain: 'document_approvals',
        status: 'insufficient_data',
        detail: 'No existen flujos de aprobación documentales registrados; no se calcula un porcentaje artificial de aprobación.',
      },
    ],
    meta: {
      mode: 'operational_baseline',
      personalEvaluation: false,
      targetsDefined: rows.some((row) => row.target_value !== null && row.target_value !== undefined),
      note: 'Los valores son baselines operacionales derivados de fuentes del sistema. No constituyen una evaluación personal mientras no existan metas aprobadas y atribución individual suficiente.',
    },
  });
}
