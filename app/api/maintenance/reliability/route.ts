export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const CLOSED = new Set(['completed', 'closed', 'cancelled', 'canceled', 'completada', 'cerrada', 'cancelada']);
const CORRECTIVE = new Set(['correctivo', 'corrective', 'emergency', 'emergencia', 'failure', 'falla']);

function norm(value: unknown) {
  return String(value ?? '').trim().toLocaleLowerCase('es-CL').replace(/\s+/g, ' ');
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function daysBetween(a: string | null, b: string | null) {
  if (!a || !b) return null;
  const diff = new Date(b).getTime() - new Date(a).getTime();
  return Number.isFinite(diff) && diff >= 0 ? diff / 86_400_000 : null;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [woResult, assetsResult, costsResult, partsResult, preventiveResult] = await Promise.all([
      context.supabase
        .from('maintenance_work_orders')
        .select('id, work_order_number, title, description, work_type, status, priority, asset_id, canonical_asset_id, scheduled_date, start_date, completion_date, actual_duration_hours, down_time_hours, root_cause, preventive_actions, created_at')
        .eq('organization_id', context.organizationId)
        .order('created_at', { ascending: true })
        .limit(5000),
      context.supabase
        .from('maintenance_assets')
        .select('id, asset_code, asset_name, asset_type, location, status, criticality, mtbf_hours')
        .eq('organization_id', context.organizationId)
        .limit(5000),
      context.supabase
        .from('work_order_cost_summary')
        .select('work_order_id, total_cost, parts_cost, labor_cost, external_cost')
        .eq('organization_id', context.organizationId)
        .limit(5000),
      context.supabase
        .from('work_order_parts')
        .select('work_order_id, canonical_product_id, quantity_installed, total_cost, status')
        .eq('organization_id', context.organizationId)
        .limit(10000),
      context.supabase
        .from('preventive_maintenance_schedules')
        .select('id, task_name, canonical_asset_id, asset_id, enabled, next_scheduled_date')
        .eq('organization_id', context.organizationId)
        .limit(5000),
    ]);

    const error = woResult.error || assetsResult.error || costsResult.error || partsResult.error || preventiveResult.error;
    if (error) return NextResponse.json({ error: 'No se pudo calcular la confiabilidad operacional.' }, { status: 500 });

    const workOrders = woResult.data || [];
    const assets = assetsResult.data || [];
    const costMap = new Map((costsResult.data || []).map((row: any) => [row.work_order_id, row]));
    const partsByWorkOrder = new Map<string, any[]>();
    for (const row of partsResult.data || []) {
      const current = partsByWorkOrder.get(row.work_order_id) || [];
      current.push(row);
      partsByWorkOrder.set(row.work_order_id, current);
    }

    const assetMap = new Map(assets.map((row: any) => [row.id, row]));
    const groups = new Map<string, any[]>();
    for (const wo of workOrders) {
      const assetKey = wo.canonical_asset_id || wo.asset_id;
      if (!assetKey) continue;
      const rows = groups.get(assetKey) || [];
      rows.push(wo);
      groups.set(assetKey, rows);
    }

    const reliability: any[] = [];
    const repeatedRootCauses: any[] = [];
    const repeatedComponents: any[] = [];

    for (const [assetId, rows] of groups.entries()) {
      const corrective = rows.filter((wo: any) => CORRECTIVE.has(norm(wo.work_type)));
      if (corrective.length === 0) continue;

      const ordered = [...corrective].sort((a: any, b: any) => new Date(a.completion_date || a.start_date || a.created_at).getTime() - new Date(b.completion_date || b.start_date || b.created_at).getTime());
      const gaps: number[] = [];
      for (let i = 1; i < ordered.length; i++) {
        const gap = daysBetween(ordered[i - 1].completion_date || ordered[i - 1].start_date || ordered[i - 1].created_at, ordered[i].start_date || ordered[i].created_at);
        if (gap != null) gaps.push(gap * 24);
      }

      const totalDowntime = corrective.reduce((sum: number, wo: any) => sum + number(wo.down_time_hours), 0);
      const totalCost = corrective.reduce((sum: number, wo: any) => sum + number(costMap.get(wo.id)?.total_cost), 0);
      const closed = corrective.filter((wo: any) => CLOSED.has(norm(wo.status)));
      const avgRepairHours = closed.length ? closed.reduce((sum: number, wo: any) => sum + number(wo.actual_duration_hours), 0) / closed.length : null;
      const observedMtbfHours = gaps.length ? gaps.reduce((sum, value) => sum + value, 0) / gaps.length : null;
      const asset = assetMap.get(assetId) || null;
      const preventive = (preventiveResult.data || []).filter((row: any) => row.enabled && (row.canonical_asset_id === assetId || row.asset_id === assetId));

      const rootCauseGroups = new Map<string, any[]>();
      for (const wo of corrective) {
        const key = norm(wo.root_cause);
        if (!key) continue;
        const current = rootCauseGroups.get(key) || [];
        current.push(wo);
        rootCauseGroups.set(key, current);
      }
      for (const [, causeRows] of rootCauseGroups.entries()) {
        if (causeRows.length < 2) continue;
        repeatedRootCauses.push({
          assetId,
          assetCode: asset?.asset_code || null,
          assetName: asset?.asset_name || 'Equipo sin ficha',
          cause: causeRows[0].root_cause,
          occurrences: causeRows.length,
          downtimeHours: causeRows.reduce((sum: number, wo: any) => sum + number(wo.down_time_hours), 0),
          cost: causeRows.reduce((sum: number, wo: any) => sum + number(costMap.get(wo.id)?.total_cost), 0),
          workOrders: causeRows.map((wo: any) => ({ id: wo.id, number: wo.work_order_number, title: wo.title })),
        });
      }

      const componentGroups = new Map<string, any[]>();
      for (const wo of corrective) {
        for (const part of partsByWorkOrder.get(wo.id) || []) {
          if (!part.canonical_product_id || number(part.quantity_installed) <= 0) continue;
          const current = componentGroups.get(part.canonical_product_id) || [];
          current.push({ wo, part });
          componentGroups.set(part.canonical_product_id, current);
        }
      }
      for (const [productId, entries] of componentGroups.entries()) {
        if (entries.length < 2) continue;
        repeatedComponents.push({
          assetId,
          assetCode: asset?.asset_code || null,
          assetName: asset?.asset_name || 'Equipo sin ficha',
          productId,
          occurrences: entries.length,
          installedQuantity: entries.reduce((sum: number, entry: any) => sum + number(entry.part.quantity_installed), 0),
          cost: entries.reduce((sum: number, entry: any) => sum + number(entry.part.total_cost), 0),
          workOrders: entries.map((entry: any) => ({ id: entry.wo.id, number: entry.wo.work_order_number, title: entry.wo.title })),
        });
      }

      reliability.push({
        assetId,
        assetCode: asset?.asset_code || null,
        assetName: asset?.asset_name || 'Equipo sin ficha',
        criticality: asset?.criticality || null,
        failures: corrective.length,
        totalDowntimeHours: totalDowntime,
        totalCost,
        observedMtbfHours,
        avgRepairHours,
        registeredMtbfHours: asset?.mtbf_hours == null ? null : number(asset.mtbf_hours),
        openCorrective: corrective.filter((wo: any) => !CLOSED.has(norm(wo.status))).length,
        preventiveCount: preventive.length,
        lastFailureAt: ordered.at(-1)?.start_date || ordered.at(-1)?.created_at || null,
        workOrders: [...corrective].reverse().slice(0, 8).map((wo: any) => ({ id: wo.id, number: wo.work_order_number, title: wo.title, status: wo.status, rootCause: wo.root_cause, downtimeHours: number(wo.down_time_hours), cost: number(costMap.get(wo.id)?.total_cost) })),
      });
    }

    reliability.sort((a, b) => b.failures - a.failures || b.totalDowntimeHours - a.totalDowntimeHours || b.totalCost - a.totalCost);
    repeatedRootCauses.sort((a, b) => b.occurrences - a.occurrences || b.downtimeHours - a.downtimeHours || b.cost - a.cost);
    repeatedComponents.sort((a, b) => b.occurrences - a.occurrences || b.cost - a.cost);

    return NextResponse.json({
      summary: {
        equipmentWithCorrective: reliability.length,
        repeatedFailureEquipment: reliability.filter((row) => row.failures >= 2).length,
        repeatedRootCauses: repeatedRootCauses.length,
        repeatedComponents: repeatedComponents.length,
        correctiveWorkOrders: reliability.reduce((sum, row) => sum + row.failures, 0),
        downtimeHours: reliability.reduce((sum, row) => sum + row.totalDowntimeHours, 0),
        cost: reliability.reduce((sum, row) => sum + row.totalCost, 0),
      },
      reliability,
      repeatedRootCauses,
      repeatedComponents,
      rules: {
        recurrence: 'Dos o más OT correctivas registradas para el mismo equipo.',
        mtbf: 'Promedio observado entre eventos correctivos consecutivos cuando existe información suficiente.',
        rootCause: 'Solo se agrupan causas raíz escritas explícitamente en OT; no se infieren causas.',
        components: 'Solo se cuentan componentes instalados registrados en las OT.',
      },
      source: 'operational',
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo calcular la confiabilidad.' }, { status: 500 });
  }
}
