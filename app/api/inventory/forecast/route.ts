export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const OUT_TYPES = new Set(['out','issue','consumption','consume','salida','dispatch']);

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const org = context.organizationId;
    const [snapshot, overview, movements] = await Promise.all([
      context.supabase
        .from('canonical_inventory_current')
        .select('snapshot_date')
        .eq('organization_id', org)
        .order('snapshot_date', { ascending: false })
        .limit(1),
      context.supabase
        .from('inventory_intelligence_overview_v1')
        .select('*')
        .eq('organization_id', org)
        .maybeSingle(),
      context.supabase
        .from('stock_movements')
        .select('created_at,movement_type,quantity,canonical_product_id')
        .eq('organization_id', org)
        .order('created_at', { ascending: true }),
    ]);

    const error = snapshot.error || overview.error || movements.error;
    if (error) throw error;

    const rows = movements.data || [];
    const consumptionRows = rows.filter((row: any) => OUT_TYPES.has(String(row.movement_type || '').trim().toLowerCase()));
    const datedRows = rows.filter((row: any) => row.created_at);
    const firstDate = datedRows.length ? String(datedRows[0].created_at).slice(0, 10) : null;
    const lastDate = datedRows.length ? String(datedRows[datedRows.length - 1].created_at).slice(0, 10) : null;
    const productCount = new Set(rows.map((row: any) => row.canonical_product_id).filter(Boolean)).size;
    const consumptionProductCount = new Set(consumptionRows.map((row: any) => row.canonical_product_id).filter(Boolean)).size;
    const historyDays = firstDate && lastDate
      ? Math.max(1, Math.round((new Date(`${lastDate}T12:00:00Z`).getTime() - new Date(`${firstDate}T12:00:00Z`).getTime()) / 86400000) + 1)
      : 0;

    const minHistoryDays = 30;
    const readiness = consumptionRows.length > 0 && historyDays >= minHistoryDays ? 'ready' : 'insufficient_history';
    const inventory = overview.data as any;

    return NextResponse.json({
      readiness,
      snapshotDate: snapshot.data?.[0]?.snapshot_date || null,
      current: {
        productsWithStock: Number(inventory?.products_with_stock || 0),
        outOfStockProducts: Number(inventory?.out_of_stock_products || 0),
        reorderProducts: Number(inventory?.reorder_products || 0),
        negativeStockProducts: Number(inventory?.negative_stock_products || 0),
      },
      history: {
        movementRows: rows.length,
        consumptionRows: consumptionRows.length,
        productsWithMovements: productCount,
        productsWithConsumption: consumptionProductCount,
        firstDate,
        lastDate,
        historyDays,
        minHistoryDays,
      },
      forecast: readiness === 'ready' ? {
        method: 'rolling_consumption',
        status: 'available_for_product_level_calculation',
      } : null,
      policy: readiness === 'ready'
        ? 'La cobertura se puede calcular sólo con salidas observadas por producto; no se extrapolan productos sin consumo histórico.'
        : `Se requieren al menos ${minHistoryDays} días de movimientos y salidas reales antes de calcular días de cobertura o riesgo de quiebre.`,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[inventory/forecast]', error);
    return NextResponse.json({ error: 'No fue posible evaluar forecast de Inventario' }, { status: 500 });
  }
}
