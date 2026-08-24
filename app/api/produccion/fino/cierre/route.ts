export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const latest = await context.supabase
    .from('production_fine_copper_daily_v1')
    .select('operation_date')
    .eq('organization_id', context.organizationId)
    .order('operation_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest.error) return NextResponse.json({ error: latest.error.message }, { status: 500 });
  if (!latest.data?.operation_date) return NextResponse.json({ period: null, concentrate: null, dispatch: null });

  const through = latest.data.operation_date;
  const date = new Date(`${through}T12:00:00Z`);
  const periodStart = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;

  const [balances, shipments] = await Promise.all([
    context.supabase
      .from('production_concentrate_dispatch_balance_v1')
      .select('plant_shift_id,operation_date,shift_code,metallurgy_state,produced_wet_metric_tons,allocated_wet_metric_tons,available_wet_metric_tons,dispatch_balance_state')
      .eq('organization_id', context.organizationId)
      .gte('operation_date', periodStart)
      .lte('operation_date', through)
      .order('operation_date')
      .order('shift_code'),
    context.supabase
      .from('production_concentrate_shipments')
      .select('id,shipment_date,shipment_number,destination,normalized_metric_tons,validation_status,source_file,source_sheet,source_row')
      .eq('organization_id', context.organizationId)
      .gte('shipment_date', periodStart)
      .lte('shipment_date', through)
      .order('shipment_date'),
  ]);

  const error = balances.error || shipments.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const balanceRows = balances.data || [];
  const shipmentRows = shipments.data || [];
  const quantifiedProduced = balanceRows.filter((row) => row.produced_wet_metric_tons !== null);
  const producedWetTons = quantifiedProduced.reduce((sum, row) => sum + Number(row.produced_wet_metric_tons || 0), 0);
  const allocatedWetTons = balanceRows.reduce((sum, row) => sum + Number(row.allocated_wet_metric_tons || 0), 0);
  const dispatchedWetTons = shipmentRows.reduce((sum, row) => sum + Number(row.normalized_metric_tons || 0), 0);

  return NextResponse.json({
    period: { periodStart, dataThrough: through },
    concentrate: {
      shifts: balanceRows.length,
      quantifiedShifts: quantifiedProduced.length,
      unquantifiedShifts: balanceRows.length - quantifiedProduced.length,
      producedWetTons: quantifiedProduced.length ? producedWetTons : null,
      allocatedWetTons,
      state: balanceRows.length === 0
        ? 'no_source_rows'
        : quantifiedProduced.length === balanceRows.length
          ? 'quantified'
          : quantifiedProduced.length === 0
            ? 'unquantified'
            : 'partial',
      note: 'La producción húmeda de concentrado sólo se publica cuando existe tonelaje fuente por turno. No se deriva desde fino Cu ni ley de concentrado para completar valores faltantes.',
    },
    dispatch: {
      shipments: shipmentRows.length,
      dispatchedWetTons: shipmentRows.length ? dispatchedWetTons : null,
      state: shipmentRows.length ? 'observed' : 'no_shipments_in_period',
      rows: shipmentRows,
      note: 'Ausencia de despachos cargados no equivale a cero producción ni cero inventario de concentrado.',
    },
    closeout: {
      state: quantifiedProduced.length === balanceRows.length && shipmentRows.length > 0 ? 'reconcilable' : 'blocked_by_source_evidence',
      missing: [
        ...(quantifiedProduced.length < balanceRows.length ? ['concentrate_produced_wet_tons'] : []),
        ...(shipmentRows.length === 0 ? ['concentrate_shipments'] : []),
      ],
      policy: 'Fino recuperado, concentrado producido y concentrado despachado permanecen como hechos separados. No se fabrican conversiones para cerrar el balance.',
    },
  });
}
