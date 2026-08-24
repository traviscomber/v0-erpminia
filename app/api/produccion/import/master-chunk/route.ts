export const dynamic = 'force-dynamic';

import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type SourceBound = {
  source_file: string;
  source_file_sha256: string;
  source_sheet: string;
  source_row: number;
  source_hash: string;
  source_payload?: Record<string, unknown>;
};

type MovementRow = SourceBound & {
  movement_number?: string | null;
  movement_date: string;
  mine_name_raw?: string | null;
  sector_name_raw?: string | null;
  driver_name_raw?: string | null;
  carrier_name_raw?: string | null;
  vehicle_plate_raw?: string | null;
  seal_number?: string | null;
  raw_quantity: number;
  raw_unit?: string | null;
  normalized_metric_tons: number;
  normalization_rule?: string | null;
  client_name_raw?: string | null;
  movement_description_raw?: string | null;
  interior_mine_raw?: string | null;
  debt_status_raw?: string | null;
  material_classification?: 'process_mineral' | 'sterile' | 'ash' | 'other' | 'unclassified';
  source_schema_version?: string | null;
  adapter_version?: string | null;
};

type ExceptionRow = SourceBound & {
  exception_type: 'zero_tonnage' | 'invalid_date' | 'invalid_quantity' | 'duplicate_source' | 'incomplete_source' | 'other';
  reason: string;
  movement_number?: string | null;
  movement_date?: string | null;
};

type PlantRow = {
  source_file_sha256: string;
  shift: SourceBound & {
    operation_date: string;
    shift_code: string;
    raw_treated_quantity?: number | null;
    raw_treated_unit?: string | null;
    treated_metric_tons?: number | null;
    normalization_status: 'pending' | 'approved' | 'rejected' | 'not_required';
    normalization_rule?: string | null;
    validation_status: 'pending' | 'valid' | 'review' | 'rejected';
    validation_notes?: string | null;
    mineral_moisture_pct?: number | null;
    lot_number_raw?: string | null;
    blend_code_raw?: string | null;
    source_schema_version?: string | null;
    adapter_version?: string | null;
  };
  metallurgy: {
    head_grade?: number | null;
    concentrate_grade?: number | null;
    tailings_grade?: number | null;
    recovery_reported?: number | null;
    recovery_calculated?: number | null;
    fine_metal_reported?: number | null;
    fine_metal_calculated?: number | null;
    concentrate_quantity?: number | null;
    concentrate_quantity_unit?: string | null;
    analysis_status: 'observed' | 'calculated' | 'partial' | 'review';
    calculation_rule_version?: string | null;
    source_file: string;
    source_sheet: string;
    source_row: number;
    source_hash: string;
    source_payload?: Record<string, unknown>;
    validation_status: 'pending' | 'valid' | 'review' | 'rejected';
    validation_notes?: string | null;
    dispatch_moisture?: number | null;
    dispatch_grade?: number | null;
    dispatched_quantity_raw?: number | null;
    dispatched_quantity_unit?: string | null;
    galigher_grade?: number | null;
    dispatched_metric_tons?: number | null;
    concentrate_wet_metric_tons?: number | null;
    concentrate_moisture_pct?: number | null;
    dispatch_fine_calculated?: number | null;
  };
};

type BatchRow = {
  id: string;
  source_file: string;
  source_file_sha256: string;
};

function sourceKey(file: string, sha: string) {
  return `${file}|${sha}`;
}

function finiteOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dispatchHash(plantSourceHash: string) {
  return createHash('sha256').update(`PLANT_DISPATCH_V1|${plantSourceHash}`).digest('hex');
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES, true);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json();
  const kind = String(body?.kind || '');
  const rows = Array.isArray(body?.rows) ? body.rows : [];

  if (!['movement', 'exception', 'plant'].includes(kind)) {
    return NextResponse.json({ error: 'kind inválido' }, { status: 400 });
  }
  if (rows.length === 0 || rows.length > 300) {
    return NextResponse.json({ error: 'Se requieren entre 1 y 300 filas por bloque' }, { status: 400 });
  }

  const { data: batchData, error: batchError } = await context.supabase
    .from('production_import_batches')
    .select('id, source_file, source_file_sha256')
    .eq('organization_id', context.organizationId)
    .eq('project_key', 'motil')
    .eq('domain_key', 'production');

  if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });
  const batches = new Map((batchData || []).map((batch: BatchRow) => [sourceKey(batch.source_file, batch.source_file_sha256), batch.id]));

  const resolveBatch = (row: SourceBound) => {
    const id = batches.get(sourceKey(row.source_file, row.source_file_sha256));
    if (!id) throw new Error(`Fuente no autorizada para Motil Producción: ${row.source_file}`);
    return id;
  };

  try {
    if (kind === 'movement') {
      const input = rows as MovementRow[];
      const invalid = input.find((row) =>
        !row.movement_date || !row.source_file || !row.source_file_sha256 || !row.source_sheet ||
        !Number.isInteger(Number(row.source_row)) || Number(row.source_row) <= 0 || !row.source_hash ||
        finiteOrNull(row.raw_quantity) === null || finiteOrNull(row.normalized_metric_tons) === null || Number(row.normalized_metric_tons) <= 0
      );
      if (invalid) return NextResponse.json({ error: 'Bloque de movimientos contiene una fila inválida' }, { status: 400 });

      const payload = input.map((row) => ({
        organization_id: context.organizationId,
        import_batch_id: resolveBatch(row),
        movement_number: row.movement_number || null,
        movement_date: row.movement_date,
        mine_name_raw: row.mine_name_raw || null,
        sector_name_raw: row.sector_name_raw || null,
        driver_name_raw: row.driver_name_raw || null,
        carrier_name_raw: row.carrier_name_raw || null,
        vehicle_plate_raw: row.vehicle_plate_raw || null,
        seal_number: row.seal_number || null,
        raw_quantity: Number(row.raw_quantity),
        raw_unit: row.raw_unit || null,
        normalized_metric_tons: Number(row.normalized_metric_tons),
        normalization_status: 'approved',
        normalization_rule: row.normalization_rule || null,
        source_file: row.source_file,
        source_sheet: row.source_sheet,
        source_row: Number(row.source_row),
        source_hash: row.source_hash,
        source_payload: row.source_payload || {},
        validation_status: 'valid',
        validation_notes: 'Importado desde master canónico Motil validado por archivo y SHA-256.',
        client_name_raw: row.client_name_raw || null,
        movement_description_raw: row.movement_description_raw || null,
        interior_mine_raw: row.interior_mine_raw || null,
        debt_status_raw: row.debt_status_raw || null,
        material_classification: row.material_classification || 'unclassified',
        source_schema_version: row.source_schema_version || null,
        adapter_version: row.adapter_version || null,
      }));

      const { error } = await context.supabase
        .from('production_material_movements')
        .upsert(payload, { onConflict: 'organization_id,source_hash', ignoreDuplicates: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ accepted: input.length });
    }

    if (kind === 'exception') {
      const input = rows as ExceptionRow[];
      const invalid = input.find((row) =>
        !row.source_file || !row.source_file_sha256 || !row.source_sheet ||
        !Number.isInteger(Number(row.source_row)) || Number(row.source_row) <= 0 || !row.source_hash || !row.reason
      );
      if (invalid) return NextResponse.json({ error: 'Bloque de excepciones contiene una fila inválida' }, { status: 400 });

      const payload = input.map((row) => ({
        organization_id: context.organizationId,
        import_batch_id: resolveBatch(row),
        exception_type: row.exception_type,
        reason: row.reason,
        movement_number: row.movement_number || null,
        movement_date: row.movement_date || null,
        source_file: row.source_file,
        source_file_sha256: row.source_file_sha256,
        source_sheet: row.source_sheet,
        source_row: Number(row.source_row),
        source_hash: row.source_hash,
        source_payload: row.source_payload || {},
        review_status: 'pending',
      }));

      const { error } = await context.supabase
        .from('production_import_exceptions')
        .upsert(payload, { onConflict: 'organization_id,source_hash', ignoreDuplicates: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ accepted: input.length });
    }

    const input = rows as PlantRow[];
    const invalid = input.find((row) =>
      !row.shift?.operation_date || !row.shift?.shift_code || !row.shift?.source_file || !row.source_file_sha256 ||
      !row.shift?.source_sheet || !Number.isInteger(Number(row.shift?.source_row)) || Number(row.shift?.source_row) <= 0 ||
      !row.shift?.source_hash || !row.metallurgy?.source_hash || row.metallurgy?.source_file !== row.shift?.source_file
    );
    if (invalid) return NextResponse.json({ error: 'Bloque de planta contiene una fila inválida' }, { status: 400 });

    const shiftPayload = input.map((row) => ({
      organization_id: context.organizationId,
      import_batch_id: resolveBatch({ ...row.shift, source_file_sha256: row.source_file_sha256 }),
      operation_date: row.shift.operation_date,
      shift_code: row.shift.shift_code,
      raw_treated_quantity: row.shift.raw_treated_quantity ?? null,
      raw_treated_unit: row.shift.raw_treated_unit || null,
      treated_metric_tons: row.shift.treated_metric_tons ?? null,
      normalization_status: row.shift.normalization_status,
      normalization_rule: row.shift.normalization_rule || null,
      source_file: row.shift.source_file,
      source_sheet: row.shift.source_sheet,
      source_row: Number(row.shift.source_row),
      source_hash: row.shift.source_hash,
      source_payload: row.shift.source_payload || {},
      validation_status: row.shift.validation_status,
      validation_notes: row.shift.validation_notes || null,
      mineral_moisture_pct: row.shift.mineral_moisture_pct ?? null,
      lot_number_raw: row.shift.lot_number_raw || null,
      blend_code_raw: row.shift.blend_code_raw || null,
      source_schema_version: row.shift.source_schema_version || null,
      adapter_version: row.shift.adapter_version || null,
    }));

    const { data: shiftData, error: shiftError } = await context.supabase
      .from('production_plant_shifts')
      .upsert(shiftPayload, { onConflict: 'organization_id,source_hash' })
      .select('id, source_hash');
    if (shiftError) return NextResponse.json({ error: shiftError.message }, { status: 500 });

    const shiftIds = new Map((shiftData || []).map((row: { id: string; source_hash: string }) => [row.source_hash, row.id]));
    const metallurgyPayload = input.map((row) => ({
      organization_id: context.organizationId,
      plant_shift_id: shiftIds.get(row.shift.source_hash),
      head_grade: row.metallurgy.head_grade ?? null,
      concentrate_grade: row.metallurgy.concentrate_grade ?? null,
      tailings_grade: row.metallurgy.tailings_grade ?? null,
      recovery_reported: row.metallurgy.recovery_reported ?? null,
      recovery_calculated: row.metallurgy.recovery_calculated ?? null,
      fine_metal_reported: row.metallurgy.fine_metal_reported ?? null,
      fine_metal_calculated: row.metallurgy.fine_metal_calculated ?? null,
      concentrate_quantity: row.metallurgy.concentrate_quantity ?? null,
      concentrate_quantity_unit: row.metallurgy.concentrate_quantity_unit || null,
      analysis_status: row.metallurgy.analysis_status,
      calculation_rule_version: row.metallurgy.calculation_rule_version || null,
      source_file: row.metallurgy.source_file,
      source_sheet: row.metallurgy.source_sheet,
      source_row: Number(row.metallurgy.source_row),
      source_hash: row.metallurgy.source_hash,
      source_payload: row.metallurgy.source_payload || {},
      validation_status: row.metallurgy.validation_status,
      validation_notes: row.metallurgy.validation_notes || null,
      dispatch_moisture: row.metallurgy.dispatch_moisture ?? null,
      dispatch_grade: row.metallurgy.dispatch_grade ?? null,
      dispatched_quantity_raw: row.metallurgy.dispatched_quantity_raw ?? null,
      dispatched_quantity_unit: row.metallurgy.dispatched_quantity_unit || null,
      galigher_grade: row.metallurgy.galigher_grade ?? null,
      dispatched_metric_tons: row.metallurgy.dispatched_metric_tons ?? null,
      concentrate_wet_metric_tons: row.metallurgy.concentrate_wet_metric_tons ?? null,
      concentrate_moisture_pct: row.metallurgy.concentrate_moisture_pct ?? null,
    }));

    if (metallurgyPayload.some((row) => !row.plant_shift_id)) {
      return NextResponse.json({ error: 'No fue posible resolver todos los turnos insertados' }, { status: 500 });
    }

    const { error: metallurgyError } = await context.supabase
      .from('production_metallurgy_results')
      .upsert(metallurgyPayload, { onConflict: 'organization_id,source_hash' });
    if (metallurgyError) return NextResponse.json({ error: metallurgyError.message }, { status: 500 });

    const dispatchRows = input.filter((row) => {
      const tons = finiteOrNull(row.metallurgy.dispatched_metric_tons);
      return tons !== null && tons > 0;
    });

    let shipmentsMaterialized = 0;
    if (dispatchRows.length > 0) {
      const shipmentPayload = dispatchRows.map((row) => {
        const wetTons = Number(row.metallurgy.dispatched_metric_tons);
        const moisture = finiteOrNull(row.metallurgy.dispatch_moisture);
        const grade = finiteOrNull(row.metallurgy.dispatch_grade);
        const complete = moisture !== null && grade !== null;
        return {
          organization_id: context.organizationId,
          import_batch_id: resolveBatch({ ...row.shift, source_file_sha256: row.source_file_sha256 }),
          shipment_date: row.shift.operation_date,
          raw_quantity: wetTons,
          raw_unit: 't',
          normalized_metric_tons: wetTons,
          normalization_status: 'approved',
          normalization_rule: 'PLANT_DISPATCH_WET_TONS_V1',
          source_file: row.shift.source_file,
          source_sheet: row.shift.source_sheet,
          source_row: Number(row.shift.source_row),
          source_hash: dispatchHash(row.shift.source_hash),
          source_payload: {
            FECHA: row.shift.operation_date,
            TURNO: row.shift.shift_code,
            'HUMEDAD CONCENTRADO %': moisture,
            'LEY DESPACHO %': grade,
            'DESPACHO HUMEDO t': wetTons,
            'FINO DESPACHADO CALCULADO t': row.metallurgy.dispatch_fine_calculated ?? null,
            _canonical_source: 'PLANTA_LEYES_CANONICO',
          },
          validation_status: complete ? 'valid' : 'review',
          validation_notes: complete ? null : 'Despacho preservado; humedad de concentrado o ley de despacho faltante en fuente.',
        };
      });

      const { data: shipmentData, error: shipmentError } = await context.supabase
        .from('production_concentrate_shipments')
        .upsert(shipmentPayload, { onConflict: 'organization_id,source_hash' })
        .select('id, source_hash');
      if (shipmentError) return NextResponse.json({ error: shipmentError.message }, { status: 500 });

      const shipmentIds = new Map((shipmentData || []).map((row: { id: string; source_hash: string }) => [row.source_hash, row.id]));
      const allocationPayload = dispatchRows.map((row) => ({
        organization_id: context.organizationId,
        shipment_id: shipmentIds.get(dispatchHash(row.shift.source_hash)),
        plant_shift_id: shiftIds.get(row.shift.source_hash),
        allocated_wet_metric_tons: Number(row.metallurgy.dispatched_metric_tons),
        allocation_rule_version: 'source_row_v1',
      }));

      if (allocationPayload.some((row) => !row.shipment_id || !row.plant_shift_id)) {
        return NextResponse.json({ error: 'No fue posible resolver todos los despachos materializados' }, { status: 500 });
      }

      const { error: allocationError } = await context.supabase
        .from('production_concentrate_shipment_allocations')
        .upsert(allocationPayload, { onConflict: 'organization_id,shipment_id,plant_shift_id' });
      if (allocationError) return NextResponse.json({ error: allocationError.message }, { status: 500 });
      shipmentsMaterialized = allocationPayload.length;
    }

    return NextResponse.json({ accepted: input.length, shipmentsMaterialized });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error de importación maestra' }, { status: 400 });
  }
}
