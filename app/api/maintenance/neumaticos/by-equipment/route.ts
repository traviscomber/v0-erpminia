export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type TireTraceabilityRow = {
  id: string;
  tire_code: string | null;
  tire_name: string | null;
  tire_condition: string | null;
  lifecycle_status: string | null;
  installed_asset_id: string | null;
  installed_at: string | null;
  removed_at: string | null;
  purchase_order_number: string | null;
  notes: string | null;
  updated_at: string | null;
  asset?: {
    asset_code: string | null;
    asset_name: string | null;
    asset_type: string | null;
  } | null;
  work_order?: {
    work_order_number: string | null;
    title: string | null;
  } | null;
};

function normalizeLifecycleStatus(status: string | null): string {
  const statusMap: Record<string, string> = {
    in_stock: 'Bodega',
    installed: 'Instalado',
    in_repair: 'En reparación',
    replaced: 'Reemplazado',
    retired: 'Retirado',
    in_replacement: 'En reposición',
  };
  return statusMap[String(status || '').toLowerCase()] || String(status || 'Desconocido');
}

function normalizeTireCondition(condition: string | null): string {
  const conditionMap: Record<string, string> = {
    new: 'Nuevo',
    used: 'Usado',
    worn: 'Gastado',
    damaged: 'Dañado',
    repaired: 'Reparado',
  };
  return conditionMap[String(condition || '').toLowerCase()] || String(condition || 'N/A');
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const equipmentCode = searchParams.get('equipmentCode')?.trim();
    const lifecycleFilter = searchParams.get('lifecycleStatus')?.trim();
    const dateFrom = searchParams.get('dateFrom')?.trim();
    const dateTo = searchParams.get('dateTo')?.trim();

    if (!equipmentCode) {
      return NextResponse.json(
        { error: 'Se requiere equipmentCode como parámetro' },
        { status: 400 }
      );
    }

    // Get equipment first
    const { data: equipment, error: equipmentError } = await context.supabase
      .from('maintenance_assets')
      .select('id, asset_code, asset_name, asset_type, mtbf_hours')
      .eq('organization_id', context.organizationId)
      .eq('asset_code', equipmentCode)
      .maybeSingle();

    if (equipmentError) throw equipmentError;

    if (!equipment) {
      return NextResponse.json(
        { tires: [], equipment: null, summary: {
          total: 0,
          installed: 0,
          inStock: 0,
          retired: 0,
          totalCost: 0,
        }},
        { status: 200 }
      );
    }

    // Build tire query
    let query = context.supabase
      .from('maintenance_tires')
      .select(
        'id, tire_code, tire_name, tire_condition, lifecycle_status, installed_asset_id, installed_at, removed_at, purchase_order_number, notes, updated_at, asset:maintenance_assets(asset_code, asset_name, asset_type), work_order:maintenance_work_orders(work_order_number, title)'
      )
      .eq('organization_id', context.organizationId)
      .eq('installed_asset_id', equipment.id);

    if (lifecycleFilter) {
      query = query.eq('lifecycle_status', lifecycleFilter);
    }

    if (dateFrom) {
      query = query.gte('installed_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('installed_at', dateTo);
    }

    const { data: tires, error: tiresError } = await query.order('installed_at', {
      ascending: false,
    });

    if (tiresError) throw tiresError;

    const tireRows = (Array.isArray(tires) ? (tires as unknown as TireTraceabilityRow[]) : []).map((tire: any) => ({
      id: tire.id,
      tireCode: tire.tire_code,
      tireName: tire.tire_name,
      condition: normalizeTireCondition(tire.tire_condition),
      lifecycleStatus: normalizeLifecycleStatus(tire.lifecycle_status),
      installedAt: tire.installed_at,
      removedAt: tire.removed_at,
      purchaseOrderNumber: tire.purchase_order_number,
      notes: tire.notes,
      updatedAt: tire.updated_at,
      asset: tire.asset,
      workOrder: tire.work_order,
      daysInstalled: tire.installed_at
        ? Math.floor(
            (Date.now() - new Date(tire.installed_at).getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0,
    }));

    const summary = {
      total: tireRows.length,
      installed: tireRows.filter((t) => t.lifecycleStatus === 'Instalado').length,
      inStock: tireRows.filter((t) => t.lifecycleStatus === 'Bodega').length,
      retired: tireRows.filter((t) => t.lifecycleStatus === 'Retirado').length,
      totalCost: 0, // Aggregate cost from inventory if needed
    };

    return NextResponse.json(
      {
        equipment: {
          id: equipment.id,
          assetCode: equipment.asset_code,
          assetName: equipment.asset_name,
          assetType: equipment.asset_type,
          mtbfHours: equipment.mtbf_hours,
        },
        tires: tireRows,
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error al cargar neumáticos por equipo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
