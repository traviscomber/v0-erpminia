export const dynamic = 'force-dynamic';

import { createHash, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type TransportBody = {
  mode: 'mineral_transport';
  movementDate: string;
  movementNumber?: string;
  client?: string;
  description?: string;
  driver?: string;
  carrier?: string;
  plate?: string;
  sector?: string;
  mineOrigin?: string;
  interiorMine?: string;
  sealNumber?: string;
  netWeight: number;
  debtStatus?: string;
};

type PlantBody = {
  mode: 'plant_metallurgy';
  operationDate: string;
  shiftCode: string;
  treatedWetMetricTons: number;
  mineralMoisturePct: number;
  headGrade: number;
  concentrateGrade?: number | null;
  tailingsGrade?: number | null;
  galigherGrade?: number | null;
  concentrateWetMetricTons?: number | null;
  concentrateMoisturePct?: number | null;
  dispatchedMetricTons?: number | null;
  dispatchMoisturePct?: number | null;
  dispatchGrade?: number | null;
  lotNumber?: string | null;
  blendCode?: string | null;
};

type Body = TransportBody | PlantBody;

type NormalizationRule = {
  rule_code: string;
  effective_from: string | null;
  effective_to: string | null;
  raw_unit: string;
  multiplier: number | string;
  rule_version: string;
};

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function appliesToDate(rule: NormalizationRule, date: string) {
  return (!rule.effective_from || date >= rule.effective_from) &&
    (!rule.effective_to || date <= rule.effective_to);
}

function finite(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pct(value: unknown) {
  const n = finite(value);
  return n !== null && n >= 0 && n < 100 ? n : null;
}

function classifyMaterial(description?: string | null) {
  const value = String(description || '').trim().toLowerCase();
  if (!value) return 'unclassified';
  if (value.includes('esteril') || value.includes('estéril')) return 'sterile';
  if (value.includes('ceniza')) return 'ash';
  if (value.includes('mineral')) return 'process_mineral';
  return 'other';
}

async function createBatchAndSession(
  context: Extract<Awaited<ReturnType<typeof getOrganizationContext>>, { ok: true }>,
  options: {
    sourceType: 'tm' | 'ley';
    mode: 'mineral_transport' | 'plant_metallurgy';
    templateVersion: string;
    payload: unknown;
    date: string;
  }
) {
  const token = randomUUID();
  const sourceFile = `manual://production/${options.mode}/${token}`;
  const fileHash = sha256({ sourceFile, payload: options.payload });

  const { data: batch, error: batchError } = await context.supabase
    .from('production_import_batches')
    .insert({
      organization_id: context.organizationId,
      source_type: options.sourceType,
      source_file: sourceFile,
      source_file_sha256: fileHash,
      period_start: options.date,
      period_end: options.date,
      status: 'approved_for_import',
      normalization_rule_version: options.templateVersion,
      notes: 'Ingreso manual desde módulo Producción.',
      created_by: context.userId,
    })
    .select('id')
    .single();

  if (batchError || !batch) throw new Error(batchError?.message || 'No fue posible crear batch manual');

  const { data: session, error: sessionError } = await context.supabase
    .from('production_data_entry_sessions')
    .insert({
      organization_id: context.organizationId,
      entry_mode: options.mode,
      entry_source: 'manual',
      import_batch_id: batch.id,
      template_version: options.templateVersion,
      status: 'validated',
      validation_summary: { source: 'manual', schema: options.templateVersion },
      created_by: context.userId,
    })
    .select('id')
    .single();

  if (sessionError || !session) throw new Error(sessionError?.message || 'No fue posible crear sesión de ingreso');
  return { batchId: batch.id as string, sessionId: session.id as string, sourceFile, sourceHash: fileHash };
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = (await request.json()) as Body;
  if (!body?.mode) return NextResponse.json({ error: 'mode es obligatorio' }, { status: 400 });

  try {
    if (body.mode === 'mineral_transport') {
      const rawQuantity = finite(body.netWeight);
      if (!body.movementDate || rawQuantity === null || rawQuantity <= 0) {
        return NextResponse.json({ error: 'Fecha y tonelaje/peso neto válido son obligatorios' }, { status: 400 });
      }

      const { data: rules, error: rulesError } = await context.supabase
        .from('production_normalization_rules')
        .select('rule_code, effective_from, effective_to, raw_unit, multiplier, rule_version')
        .eq('organization_id', context.organizationId)
        .eq('source_type', 'tm')
        .eq('status', 'approved');
      if (rulesError) throw new Error(rulesError.message);

      const rule = (rules || []).find((candidate) => appliesToDate(candidate as NormalizationRule, body.movementDate)) as NormalizationRule | undefined;
      if (!rule) return NextResponse.json({ error: `No existe regla TM aprobada para ${body.movementDate}` }, { status: 400 });

      const lineage = await createBatchAndSession(context, {
        sourceType: 'tm',
        mode: 'mineral_transport',
        templateVersion: 'TM_2026_V1',
        payload: body,
        date: body.movementDate,
      });

      const rowHash = sha256({ ...body, sourceFile: lineage.sourceFile, schema: 'TM_2026_V1' });
      const { data: movement, error: movementError } = await context.supabase
        .from('production_material_movements')
        .insert({
          organization_id: context.organizationId,
          import_batch_id: lineage.batchId,
          movement_number: body.movementNumber || null,
          movement_date: body.movementDate,
          client_name_raw: body.client || null,
          movement_description_raw: body.description || null,
          driver_name_raw: body.driver || null,
          carrier_name_raw: body.carrier || null,
          vehicle_plate_raw: body.plate || null,
          sector_name_raw: body.sector || null,
          mine_name_raw: body.mineOrigin || null,
          interior_mine_raw: body.interiorMine || null,
          seal_number: body.sealNumber || null,
          debt_status_raw: body.debtStatus || null,
          material_classification: classifyMaterial(body.description),
          raw_quantity: rawQuantity,
          raw_unit: rule.raw_unit,
          normalized_metric_tons: rawQuantity * Number(rule.multiplier),
          normalization_status: 'approved',
          normalization_rule: `${rule.rule_code}@${rule.rule_version}`,
          source_file: lineage.sourceFile,
          source_sheet: 'Manual',
          source_row: 1,
          source_hash: rowHash,
          source_schema_version: 'TM_2026_V1',
          adapter_version: 'manual_v1',
          source_payload: {},
          validation_status: 'valid',
          validation_notes: 'Ingreso manual validado contra contrato TM_2026_V1.',
        })
        .select('id, normalized_metric_tons, raw_unit, normalization_rule')
        .single();
      if (movementError || !movement) throw new Error(movementError?.message || 'No fue posible guardar movimiento');

      await Promise.all([
        context.supabase.from('production_import_batches').update({ status: 'imported', updated_at: new Date().toISOString() }).eq('id', lineage.batchId).eq('organization_id', context.organizationId),
        context.supabase.from('production_data_entry_sessions').update({ status: 'committed', updated_at: new Date().toISOString() }).eq('id', lineage.sessionId).eq('organization_id', context.organizationId),
      ]);

      return NextResponse.json({ sessionId: lineage.sessionId, movement });
    }

    const treatedWet = finite(body.treatedWetMetricTons);
    const mineralMoisture = pct(body.mineralMoisturePct);
    const headGrade = finite(body.headGrade);
    if (!body.operationDate || !body.shiftCode?.trim() || treatedWet === null || treatedWet < 0 || mineralMoisture === null || headGrade === null) {
      return NextResponse.json({ error: 'Fecha, turno, toneladas húmedas, humedad mineral y ley de cabeza válidas son obligatorias' }, { status: 400 });
    }

    const concentrateMoisture = body.concentrateMoisturePct == null ? null : pct(body.concentrateMoisturePct);
    const dispatchMoisture = body.dispatchMoisturePct == null ? null : pct(body.dispatchMoisturePct);
    if (body.concentrateMoisturePct != null && concentrateMoisture === null) {
      return NextResponse.json({ error: 'Humedad de concentrado debe estar entre 0 y 100' }, { status: 400 });
    }
    if (body.dispatchMoisturePct != null && dispatchMoisture === null) {
      return NextResponse.json({ error: 'Humedad de despacho debe estar entre 0 y 100' }, { status: 400 });
    }

    const lineage = await createBatchAndSession(context, {
      sourceType: 'ley',
      mode: 'plant_metallurgy',
      templateVersion: 'PLANT_METALLURGY_V2',
      payload: body,
      date: body.operationDate,
    });
    const rowHash = sha256({ ...body, sourceFile: lineage.sourceFile, schema: 'PLANT_METALLURGY_V2' });

    const { data: shift, error: shiftError } = await context.supabase
      .from('production_plant_shifts')
      .insert({
        organization_id: context.organizationId,
        import_batch_id: lineage.batchId,
        operation_date: body.operationDate,
        shift_code: body.shiftCode.trim(),
        raw_treated_quantity: treatedWet,
        raw_treated_unit: 't',
        treated_metric_tons: treatedWet,
        mineral_moisture_pct: mineralMoisture,
        normalization_status: 'not_required',
        normalization_rule: 'MANUAL_TON_V1',
        lot_number_raw: body.lotNumber || null,
        blend_code_raw: body.blendCode || null,
        source_file: lineage.sourceFile,
        source_sheet: 'Manual',
        source_row: 1,
        source_hash: rowHash,
        source_payload: {},
        validation_status: 'valid',
        validation_notes: 'Ingreso manual en base húmeda con humedad mineral explícita.',
      })
      .select('id')
      .single();
    if (shiftError || !shift) throw new Error(shiftError?.message || 'No fue posible guardar turno');

    const concentrateWet = body.concentrateWetMetricTons == null ? null : finite(body.concentrateWetMetricTons);
    const dispatched = body.dispatchedMetricTons == null ? null : finite(body.dispatchedMetricTons);
    const { data: metallurgy, error: metallurgyError } = await context.supabase
      .from('production_metallurgy_results')
      .insert({
        organization_id: context.organizationId,
        plant_shift_id: shift.id,
        head_grade: headGrade,
        concentrate_grade: body.concentrateGrade == null ? null : finite(body.concentrateGrade),
        tailings_grade: body.tailingsGrade == null ? null : finite(body.tailingsGrade),
        galigher_grade: body.galigherGrade == null ? null : finite(body.galigherGrade),
        concentrate_wet_metric_tons: concentrateWet,
        concentrate_moisture_pct: concentrateMoisture,
        dispatched_metric_tons: dispatched,
        dispatch_moisture: dispatchMoisture,
        dispatch_grade: body.dispatchGrade == null ? null : finite(body.dispatchGrade),
        analysis_status: 'observed',
        calculation_rule_version: 'v2',
        source_file: lineage.sourceFile,
        source_sheet: 'Manual',
        source_row: 1,
        source_hash: rowHash,
        source_payload: {},
        validation_status: 'valid',
        validation_notes: 'Cálculos automáticos se obtienen desde production_metallurgy_automatic_v1.',
      })
      .select('id')
      .single();
    if (metallurgyError || !metallurgy) throw new Error(metallurgyError?.message || 'No fue posible guardar resultado metalúrgico');

    const { data: automatic, error: automaticError } = await context.supabase
      .from('production_metallurgy_automatic_v1')
      .select('automatic_mineral_dry_tons, automatic_feed_fine, automatic_recovery_by_grades, automatic_concentrate_dry_tons, automatic_concentrate_fine, automatic_recovery_by_fine_balance, automatic_real_fine_dispatch')
      .eq('id', metallurgy.id)
      .maybeSingle();
    if (automaticError) throw new Error(automaticError.message);

    await Promise.all([
      context.supabase.from('production_import_batches').update({ status: 'imported', updated_at: new Date().toISOString() }).eq('id', lineage.batchId).eq('organization_id', context.organizationId),
      context.supabase.from('production_data_entry_sessions').update({ status: 'committed', validation_summary: { source: 'manual', calculations: automatic || {} }, updated_at: new Date().toISOString() }).eq('id', lineage.sessionId).eq('organization_id', context.organizationId),
    ]);

    return NextResponse.json({ sessionId: lineage.sessionId, shiftId: shift.id, metallurgyId: metallurgy.id, automatic });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible guardar el ingreso' }, { status: 500 });
  }
}
