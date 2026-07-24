export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type AssetRow = {
  id: string;
  asset_code: string | null;
  asset_name: string | null;
  asset_type: string | null;
  status: string | null;
  work_orders: Array<{
    id: string;
    status: string;
  }> | null;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    // Use cost_centers as the source of truth for fleet size (always 140+ equipos)
    // Enrich with maintenance_assets work_orders when available
    const [{ data: costCenters }, { data: assets }] = await Promise.all([
      context.supabase
        .from('cost_centers')
        .select('id, code, name, status')
        .eq('organization_id', context.organizationId),
      context.supabase
        .from('maintenance_assets')
        .select('id, status, work_orders:maintenance_work_orders(id, status)')
        .eq('organization_id', context.organizationId),
    ]);

    // Build a lookup from asset id → work_orders for enrichment
    const assetLookup = new Map<string, { status: string | null; work_orders: Array<{ id: string; status: string }> | null }>();
    for (const a of (assets || [])) {
      assetLookup.set(a.id, { status: a.status, work_orders: a.work_orders });
    }

    const assetRows: AssetRow[] = (costCenters || []).map((cc) => {
      const enriched = assetLookup.get(cc.id);
      return {
        id: cc.id,
        asset_code: cc.code ?? null,
        asset_name: cc.name ?? null,
        asset_type: null,
        status: enriched?.status ?? cc.status ?? 'activo',
        work_orders: enriched?.work_orders ?? null,
      };
    });

    const statusMap: Record<string, 'operational' | 'maintenance' | 'critical'> = {
      operational: 'operational',
      available: 'operational',
      activo: 'operational',
      maintenance: 'maintenance',
      mantenimiento: 'maintenance',
      en_mantenimiento: 'maintenance',
      in_progress: 'maintenance',
      critical: 'critical',
      critico: 'critical',
      down: 'critical',
      fault: 'critical',
    };

    const assetsByStatus = assetRows.reduce(
      (acc, asset) => {
        const currentStatus = asset.work_orders?.some((wo) => wo.status === 'in_progress')
          ? 'maintenance'
          : statusMap[String(asset.status || '').toLowerCase()] || 'operational';

        acc[currentStatus]++;
        return acc;
      },
      { operational: 0, maintenance: 0, critical: 0 }
    );

    const total = assetRows.length;
    const available = assetsByStatus.operational;
    const availability = total > 0 ? Math.round((available / total) * 100) : 0;

    return NextResponse.json(
      {
        summary: {
          totalAssets: total,
          operational: assetsByStatus.operational,
          maintenance: assetsByStatus.maintenance,
          critical: assetsByStatus.critical,
          availabilityPercentage: availability,
          healthStatus:
            availability >= 80
              ? 'excellent'
              : availability >= 60
                ? 'good'
                : availability >= 40
                  ? 'warning'
                  : 'critical',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error al obtener disponibilidad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
