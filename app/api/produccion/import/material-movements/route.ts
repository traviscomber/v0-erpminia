export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type MovementInput = {
  movement_number?: string | null;
  movement_date: string;
  mine_name_raw?: string | null;
  sector_name_raw?: string | null;
  driver_name_raw?: string | null;
  carrier_name_raw?: string | null;
  vehicle_plate_raw?: string | null;
  seal_number?: string | null;
  raw_quantity: number;
  client_name_raw?: string | null;
  movement_description_raw?: string | null;
  interior_mine_raw?: string | null;
  debt_status_raw?: string | null;
  source_file: string;
  source_sheet: string;
  source_row: number;
  source_hash: string;
  source_payload?: Record<string, unknown>;
};

type NormalizationRule = {
  rule_code: string;
  effective_from: string | null;
  effective_to: string | null;
  raw_unit: string;
  multiplier: number | string;
  rule_version: string;
};

function appliesToDate(rule: NormalizationRule, date: string) {
  return (!rule.effective_from || date >= rule.effective_from) &&
    (!rule.effective_to || date <= rule.effective_to);
}

function classifyMaterial(description?: string | null) {
  const value = String(description || '').trim().toLowerCase();
  if (!value) return 'unclassified';
  if (value.includes('esteril') || value.includes('estéril')) return 'sterile';
  if (value.includes('ceniza')) return 'ash';
  if (value.includes('mineral')) return 'process_mineral';
  return 'other';
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES, true);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json();
  const batchId = String(body?.batchId || '').trim();
  const rows = Array.isArray(body?.rows) ? (body.rows as MovementInput[]) : [];

  if (!batchId || rows.length === 0 || rows.length > 500) {
    return NextResponse.json(
      { error: 'batchId y entre 1 y 500 movimientos son obligatorios' },
      { status: 400 }
    );
  }

  const { data: batch, error: batchError } = await context.supabase
    .from('production_import_batches')
    .select('id, source_type, source_file, status')
    .eq('id', batchId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });
  if (!batch || batch.source_type !== 'tm') {
    return NextResponse.json({ error: 'Batch TM no encontrado para la organización' }, { status: 404 });
  }

  const invalid = rows.find((row) =>
    !row.movement_date ||
    !Number.isFinite(Number(row.raw_quantity)) ||
    !row.source_file ||
    !row.source_sheet ||
    !Number.isInteger(Number(row.source_row)) ||
    Number(row.source_row) <= 0 ||
    !row.source_hash
  );
  if (invalid) {
    return NextResponse.json({ error: 'Existe al menos una fila TM estructuralmente inválida' }, { status: 400 });
  }

  const { data: rules, error: rulesError } = await context.supabase
    .from('production_normalization_rules')
    .select('rule_code, effective_from, effective_to, raw_unit, multiplier, rule_version')
    .eq('organization_id', context.organizationId)
    .eq('source_type', 'tm')
    .eq('status', 'approved');

  if (rulesError) return NextResponse.json({ error: rulesError.message }, { status: 500 });

  const normalized = rows.map((row) => {
    const rule = (rules || []).find((candidate) => appliesToDate(candidate as NormalizationRule, row.movement_date)) as NormalizationRule | undefined;
    if (!rule) throw new Error(`No existe regla TM aprobada para ${row.movement_date}`);
    const rawQuantity = Number(row.raw_quantity);
    const multiplier = Number(rule.multiplier);
    return {
      organization_id: context.organizationId,
      import_batch_id: batchId,
      movement_number: row.movement_number || null,
      movement_date: row.movement_date,
      mine_name_raw: row.mine_name_raw || null,
      sector_name_raw: row.sector_name_raw || null,
      driver_name_raw: row.driver_name_raw || null,
      carrier_name_raw: row.carrier_name_raw || null,
      vehicle_plate_raw: row.vehicle_plate_raw || null,
      seal_number: row.seal_number || null,
      raw_quantity: rawQuantity,
      raw_unit: rule.raw_unit,
      normalized_metric_tons: rawQuantity * multiplier,
      normalization_status: 'approved',
      normalization_rule: `${rule.rule_code}@${rule.rule_version}`,
      client_name_raw: row.client_name_raw || null,
      movement_description_raw: row.movement_description_raw || null,
      interior_mine_raw: row.interior_mine_raw || null,
      debt_status_raw: row.debt_status_raw || null,
      material_classification: classifyMaterial(row.movement_description_raw),
      source_file: row.source_file,
      source_sheet: row.source_sheet,
      source_row: Number(row.source_row),
      source_hash: row.source_hash,
      source_payload: row.source_payload || {},
      validation_status: 'valid',
      validation_notes: 'Estructura validada; reconciliación de entidades se gestiona por separado.',
    };
  });

  const { data, error } = await context.supabase
    .from('production_material_movements')
    .upsert(normalized, {
      onConflict: 'organization_id,source_hash',
      ignoreDuplicates: true,
    })
    .select('id, source_hash');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (batch.status === 'pending_normalization' || batch.status === 'analyzed') {
    await context.supabase
      .from('production_import_batches')
      .update({ status: 'approved_for_import', updated_at: new Date().toISOString() })
      .eq('id', batchId)
      .eq('organization_id', context.organizationId);
  }

  return NextResponse.json({
    accepted: rows.length,
    inserted: data?.length || 0,
    batchId,
  });
}
