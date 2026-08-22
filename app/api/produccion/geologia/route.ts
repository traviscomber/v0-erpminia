export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [mines, sectors, drilling, recentDrilling] = await Promise.all([
    context.supabase
      .from('production_mine_sources')
      .select('id,code,name,normalized_name,status,cost_center_id')
      .eq('organization_id', context.organizationId)
      .order('name'),
    context.supabase
      .from('production_mine_sectors')
      .select('id,mine_source_id,name,normalized_name,status')
      .eq('organization_id', context.organizationId)
      .order('name'),
    context.supabase
      .from('production_drilling_source_reports')
      .select('id,operation_date,hole_code_raw,mine_raw,sector_raw,drilled_meters,canonical_mine_source_id,canonical_mine_sector_id,canonical_drill_hole_id,reconciliation_status')
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('production_drilling_source_reports')
      .select('id,operation_date,hole_code_raw,mine_raw,sector_raw,drilled_meters,reconciliation_status,canonical_mine_source_id,canonical_mine_sector_id,canonical_drill_hole_id')
      .eq('organization_id', context.organizationId)
      .order('operation_date', { ascending: false })
      .order('source_row', { ascending: false })
      .limit(20),
  ]);

  const error = mines.error || sectors.error || drilling.error || recentDrilling.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const mineRows = mines.data || [];
  const sectorRows = sectors.data || [];
  const drillingRows = drilling.data || [];

  const linkedMineReports = drillingRows.filter((r) => r.canonical_mine_source_id).length;
  const linkedSectorReports = drillingRows.filter((r) => r.canonical_mine_sector_id).length;
  const linkedHoleReports = drillingRows.filter((r) => r.canonical_drill_hole_id).length;
  const totalMeters = drillingRows.reduce((sum, r) => sum + Number(r.drilled_meters || 0), 0);

  const sectorsByMine = new Map<string, number>();
  for (const sector of sectorRows) {
    if (!sector.mine_source_id) continue;
    sectorsByMine.set(sector.mine_source_id, (sectorsByMine.get(sector.mine_source_id) || 0) + 1);
  }

  const drillingByMine = new Map<string, { reports: number; meters: number }>();
  for (const report of drillingRows) {
    if (!report.canonical_mine_source_id) continue;
    const current = drillingByMine.get(report.canonical_mine_source_id) || { reports: 0, meters: 0 };
    current.reports += 1;
    current.meters += Number(report.drilled_meters || 0);
    drillingByMine.set(report.canonical_mine_source_id, current);
  }

  const mineSummary = mineRows.map((mine) => ({
    id: mine.id,
    code: mine.code,
    name: mine.name,
    status: mine.status,
    sectors: sectorsByMine.get(mine.id) || 0,
    drillingReports: drillingByMine.get(mine.id)?.reports || 0,
    drilledMeters: drillingByMine.get(mine.id)?.meters || 0,
  }));

  return NextResponse.json({
    summary: {
      mines: mineRows.length,
      sectors: sectorRows.length,
      drillingReports: drillingRows.length,
      drilledMeters: totalMeters,
      mineLinkCoveragePct: drillingRows.length ? (linkedMineReports / drillingRows.length) * 100 : 0,
      sectorLinkCoveragePct: drillingRows.length ? (linkedSectorReports / drillingRows.length) * 100 : 0,
      holeLinkCoveragePct: drillingRows.length ? (linkedHoleReports / drillingRows.length) * 100 : 0,
    },
    mines: mineSummary,
    recentDrilling: recentDrilling.data || [],
    intelligenceStatus: {
      geologicalSamplesCanonical: false,
      assaysCanonical: false,
      drillHolesCanonical: linkedHoleReports > 0,
      note: 'La inteligencia geológica utiliza hoy minas/sectores canónicos y evidencia de sondaje. Muestras, ensayos geológicos y pozos/intervalos deben reconciliarse antes de inferir ley o continuidad por sector.',
    },
    externalContext: {
      authority: 'SERNAGEOMIN',
      treatment: 'external_context_not_canonical_operation',
      sources: [
        {
          key: 'catastro_concesiones',
          name: 'Catastro de Concesiones Mineras',
          status: 'public',
          referenceDate: '2026-08-05',
          url: 'https://appsngmaz.sernageomin.cl/catastro_SNGM/home/index',
          use: 'Contexto de propiedad minera y concesiones; no reemplaza los maestros internos de mina/sector.',
        },
        {
          key: 'sigex',
          name: 'SIGEX',
          status: 'public',
          url: 'https://www.sernageomin.cl/sigex/',
          use: 'Referencia oficial de información de exploración geológica entregada bajo artículo 21 del Código de Minería.',
        },
        {
          key: 'sia_yacimientos',
          name: 'SIA Yacimientos',
          status: 'public_viewer',
          url: 'https://www.sernageomin.cl/visores-mineros/',
          use: 'Contexto público de yacimientos y ocurrencias minerales.',
        },
        {
          key: 'geoquimica',
          name: 'Visor de Datos Geoquímicos',
          status: 'public_viewer',
          url: 'https://www.sernageomin.cl/visores-mineros/',
          use: 'Contexto geoquímico público; cualquier cruce con la operación requiere georreferenciación y reconciliación explícita.',
        },
        {
          key: 'instalaciones_mineras',
          name: 'Visor de Instalaciones Mineras',
          status: 'public_viewer',
          url: 'https://www.sernageomin.cl/visores-mineros/',
          use: 'Contexto de instalaciones mineras registradas públicamente.',
        },
      ],
    },
  });
}
