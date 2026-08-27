export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { deriveMachinesFromCostCenters, inferMachineFamilyFromText } from '@/lib/maintenance/cost-center-machines';
import { isActiveCostCenterStatus, sortCostCenters } from '@/lib/cost-centers';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [{ data: workOrders, error: workOrderError }, { data: assets, error: assetError }, { data: costCenters, error: costCenterError }] = await Promise.all([
      context.supabase
        .from('maintenance_work_orders')
        .select('id,work_order_number,title,status,priority,scheduled_date,asset_id,canonical_asset_id,cost_center_id')
        .eq('organization_id', context.organizationId)
        .is('cost_center_id', null)
        .order('created_at', { ascending: false }),
      context.supabase
        .from('maintenance_assets')
        .select('id,asset_code,asset_name,asset_type,manufacturer,model,location,status')
        .eq('organization_id', context.organizationId),
      context.supabase
        .from('cost_centers')
        .select('id,code,name,description,status')
        .eq('organization_id', context.organizationId),
    ]);
    if (workOrderError) throw workOrderError;
    if (assetError) throw assetError;
    if (costCenterError) throw costCenterError;

    const activeCenters = sortCostCenters((costCenters || []).filter((center) => isActiveCostCenterStatus(center.status)) as any[]);
    const machines = deriveMachinesFromCostCenters(activeCenters as any[]);
    const assetMap = new Map((assets || []).map((asset) => [asset.id, asset]));

    const rows = (workOrders || []).map((workOrder) => {
      const asset = workOrder.asset_id ? assetMap.get(workOrder.asset_id) : null;
      const evidenceText = [asset?.asset_name, asset?.asset_code, asset?.asset_type, asset?.manufacturer, asset?.model, workOrder.title].filter(Boolean).join(' ');
      const familyHint = inferMachineFamilyFromText(evidenceText);
      const familyCenters = familyHint ? machines.filter((machine) => machine.family.toLowerCase() === familyHint.toLowerCase()) : [];
      return {
        ...workOrder,
        asset: asset || null,
        family_hint: familyHint,
        suggested_centers: familyCenters.slice(0, 12),
        suggestion_basis: familyHint ? 'Familia inferida desde texto real del equipo/OT; requiere confirmación humana.' : 'Sin evidencia suficiente para sugerir una familia.',
      };
    });

    return NextResponse.json({
      rows,
      costCenters: activeCenters,
      canEdit: access.canWrite,
      summary: {
        pending: rows.length,
        withFamilyHint: rows.filter((row) => Boolean(row.family_hint)).length,
        withoutFamilyHint: rows.filter((row) => !row.family_hint).length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la cola de imputación';
    console.error('[maintenance/cost-center-review]', error);
    return NextResponse.json({ rows: [], costCenters: [], error: message }, { status: 500 });
  }
}
