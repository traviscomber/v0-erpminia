export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type QueryError = { message: string } | null;
type RangeResult<T> = PromiseLike<{ data: T[] | null; error: QueryError }>;
type CommissioningDecision = {
  id: string;
  initiative_id: string;
  previous_asset_id: string;
  replacement_asset_id: string | null;
  decision_type: string;
  commissioning_date: string | null;
  reason: string;
  approved_at: string | null;
};
type Validation = {
  id: string;
  commissioning_decision_id: string;
  previous_asset_id: string;
  evaluated_asset_id: string;
  baseline_start_date: string;
  baseline_end_date: string;
  post_start_date: string;
  post_end_date: string;
  result: string;
  status: string;
  reason: string;
  evidence_reference: string | null;
  evidence_snapshot: EvidenceSnapshot | null;
  proposed_at: string;
  approved_at: string | null;
};
type Asset = { id: string; asset_code: string; name: string; asset_type: string | null; is_active: boolean };
type Reconciliation = { source_record_id: string; linked_asset_id: string | null };
type WorkOrder = {
  id: string;
  asset_id: string | null;
  canonical_asset_id: string | null;
  work_order_number: string;
  work_type: string | null;
  status: string | null;
  scheduled_date: string | null;
  start_date: string | null;
  completion_date: string | null;
  down_time_hours: number | string | null;
  created_at: string | null;
};
type WorkOrderCost = { work_order_id: string; total_cost: number | string | null };
type PreventiveSchedule = {
  id: string;
  asset_id: string | null;
  canonical_asset_id: string | null;
  task_name: string;
  enabled: boolean;
  last_executed_date: string | null;
  next_scheduled_date: string | null;
};
type Sensor = { id: string; canonical_asset_id: string | null };
type SensorReading = { id: string; sensor_id: string; canonical_asset_id: string | null; timestamp: string | null };
type TelemetryEvent = { id: string; sensor_id: string | null; canonical_asset_id: string | null; event_at: string | null; severity: string | null };

type PeriodMetrics = {
  days: number;
  workOrders: number;
  preventiveWorkOrders: number;
  predictiveWorkOrders: number;
  correctiveWorkOrders: number;
  workOrderRate30d: number;
  costRecords: number;
  totalCost: number;
  costRate30d: number;
  downtimeRecords: number;
  downtimeHours: number;
  downtimeRate30d: number;
  sensorReadings: number;
  telemetryEvents: number;
  criticalTelemetryEvents: number;
};
type EvidenceSnapshot = {
  generatedAt: string;
  baseline: PeriodMetrics;
  post: PeriodMetrics;
  currentPreventiveSchedules: number;
  comparableSources: string[];
  gaps: string[];
};

const text = (value: unknown) => String(value ?? '').trim();
const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const lower = (value: unknown) => text(value).toLowerCase();
const dateOnly = (value: string | null) => value ? value.slice(0, 10) : null;
const workOrderDate = (row: WorkOrder) => dateOnly(row.start_date) || row.scheduled_date || dateOnly(row.created_at);
const inRange = (value: string | null, start: string, end: string) => Boolean(value && value >= start && value <= end);
const daysInclusive = (start: string, end: string) => Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
const rate30 = (value: number, days: number) => days > 0 ? Number(((value / days) * 30).toFixed(2)) : 0;

async function fetchAll<T>(queryFactory: (from: number, to: number) => RangeResult<T>) {
  const rows: T[] = [];
  const chunk = 1000;
  for (let from = 0; ; from += chunk) {
    const { data, error } = await queryFactory(from, from + chunk - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < chunk) break;
  }
  return rows;
}

function resolveWorkOrderAsset(row: WorkOrder, reconciliationBySourceId: Map<string, string>) {
  if (row.canonical_asset_id) return row.canonical_asset_id;
  if (row.asset_id) return reconciliationBySourceId.get(row.asset_id) || null;
  return null;
}

function resolvePreventiveAsset(row: PreventiveSchedule, reconciliationBySourceId: Map<string, string>) {
  if (row.canonical_asset_id) return row.canonical_asset_id;
  if (row.asset_id) return reconciliationBySourceId.get(row.asset_id) || null;
  return null;
}

function calculatePeriod(
  assetId: string,
  start: string,
  end: string,
  workOrders: WorkOrder[],
  costByWorkOrder: Map<string, number>,
  reconciliationBySourceId: Map<string, string>,
  sensorReadings: SensorReading[],
  telemetryEvents: TelemetryEvent[],
  sensorAssetById: Map<string, string>,
): PeriodMetrics {
  const days = daysInclusive(start, end);
  const periodWorkOrders = workOrders.filter((row) => resolveWorkOrderAsset(row, reconciliationBySourceId) === assetId && inRange(workOrderDate(row), start, end));
  const preventiveWorkOrders = periodWorkOrders.filter((row) => lower(row.work_type).includes('preventiv')).length;
  const predictiveWorkOrders = periodWorkOrders.filter((row) => lower(row.work_type).includes('predictiv')).length;
  const correctiveWorkOrders = periodWorkOrders.filter((row) => lower(row.work_type).includes('correctiv')).length;
  const costRows = periodWorkOrders.filter((row) => costByWorkOrder.has(row.id));
  const totalCost = costRows.reduce((sum, row) => sum + (costByWorkOrder.get(row.id) || 0), 0);
  const downtimeRows = periodWorkOrders.filter((row) => row.down_time_hours !== null && row.down_time_hours !== undefined);
  const downtimeHours = downtimeRows.reduce((sum, row) => sum + numberValue(row.down_time_hours), 0);
  const readings = sensorReadings.filter((row) => (row.canonical_asset_id || sensorAssetById.get(row.sensor_id) || null) === assetId && inRange(dateOnly(row.timestamp), start, end));
  const events = telemetryEvents.filter((row) => {
    const resolvedAsset = row.canonical_asset_id || (row.sensor_id ? sensorAssetById.get(row.sensor_id) || null : null);
    return resolvedAsset === assetId && inRange(dateOnly(row.event_at), start, end);
  });

  return {
    days,
    workOrders: periodWorkOrders.length,
    preventiveWorkOrders,
    predictiveWorkOrders,
    correctiveWorkOrders,
    workOrderRate30d: rate30(periodWorkOrders.length, days),
    costRecords: costRows.length,
    totalCost: Number(totalCost.toFixed(2)),
    costRate30d: rate30(totalCost, days),
    downtimeRecords: downtimeRows.length,
    downtimeHours: Number(downtimeHours.toFixed(2)),
    downtimeRate30d: rate30(downtimeHours, days),
    sensorReadings: readings.length,
    telemetryEvents: events.length,
    criticalTelemetryEvents: events.filter((row) => lower(row.severity) === 'critical').length,
  };
}

function buildEvidence(
  validation: Pick<Validation, 'previous_asset_id' | 'evaluated_asset_id' | 'baseline_start_date' | 'baseline_end_date' | 'post_start_date' | 'post_end_date'>,
  workOrders: WorkOrder[],
  costs: WorkOrderCost[],
  reconciliations: Reconciliation[],
  preventiveSchedules: PreventiveSchedule[],
  sensors: Sensor[],
  sensorReadings: SensorReading[],
  telemetryEvents: TelemetryEvent[],
): EvidenceSnapshot {
  const reconciliationBySourceId = new Map<string, string>();
  for (const row of reconciliations) if (row.linked_asset_id) reconciliationBySourceId.set(row.source_record_id, row.linked_asset_id);
  const costByWorkOrder = new Map(costs.map((row) => [row.work_order_id, numberValue(row.total_cost)]));
  const sensorAssetById = new Map<string, string>();
  for (const sensor of sensors) if (sensor.canonical_asset_id) sensorAssetById.set(sensor.id, sensor.canonical_asset_id);

  const baseline = calculatePeriod(validation.previous_asset_id, validation.baseline_start_date, validation.baseline_end_date, workOrders, costByWorkOrder, reconciliationBySourceId, sensorReadings, telemetryEvents, sensorAssetById);
  const post = calculatePeriod(validation.evaluated_asset_id, validation.post_start_date, validation.post_end_date, workOrders, costByWorkOrder, reconciliationBySourceId, sensorReadings, telemetryEvents, sensorAssetById);
  const currentPreventiveSchedules = preventiveSchedules.filter((row) => row.enabled && resolvePreventiveAsset(row, reconciliationBySourceId) === validation.evaluated_asset_id).length;
  const comparableSources: string[] = [];
  const gaps: string[] = [];

  if (baseline.workOrders > 0 && post.workOrders > 0) comparableSources.push('work_orders');
  else gaps.push('No existen OT registradas en ambos períodos para comparación directa');
  if (baseline.costRecords > 0 && post.costRecords > 0) comparableSources.push('costs');
  else gaps.push('No existen costos de OT registrados en ambos períodos');
  if (baseline.downtimeRecords > 0 && post.downtimeRecords > 0) comparableSources.push('downtime');
  else gaps.push('No existe downtime registrado en ambos períodos');
  if (baseline.preventiveWorkOrders > 0 && post.preventiveWorkOrders > 0) comparableSources.push('preventive');
  else gaps.push('No existen OT preventivas registradas en ambos períodos');
  if (baseline.sensorReadings > 0 && post.sensorReadings > 0) comparableSources.push('telemetry');
  else gaps.push('No existen lecturas de telemetría registradas en ambos períodos');

  return { generatedAt: new Date().toISOString(), baseline, post, currentPreventiveSchedules, comparableSources, gaps };
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function validateWindows(commissioningDate: string, baselineStart: string, baselineEnd: string, postStart: string, postEnd: string) {
  if (![baselineStart, baselineEnd, postStart, postEnd].every(validDate)) return 'Las cuatro fechas de comparación son obligatorias y deben ser válidas.';
  if (baselineStart > baselineEnd) return 'El período base tiene fechas invertidas.';
  if (postStart > postEnd) return 'El período posterior tiene fechas invertidas.';
  if (baselineEnd >= commissioningDate) return 'El período base debe terminar antes de la puesta en servicio.';
  if (postStart < commissioningDate) return 'El período posterior no puede comenzar antes de la puesta en servicio.';
  if (baselineEnd >= postStart) return 'Los períodos base y posterior no pueden superponerse.';
  const today = new Date().toISOString().slice(0, 10);
  if (postEnd > today || baselineEnd > today) return 'Los períodos de validación no pueden incluir fechas futuras.';
  return null;
}

async function loadEvidenceSources(context: Awaited<ReturnType<typeof getOrganizationContext>> & { ok: true }) {
  const canonical = context.supabase.schema('canonical');
  const [workOrders, costs, reconciliationsResult, preventiveSchedules, sensors, sensorReadings, telemetryEvents] = await Promise.all([
    fetchAll<WorkOrder>((from, to) => context.supabase.from('maintenance_work_orders').select('id,asset_id,canonical_asset_id,work_order_number,work_type,status,scheduled_date,start_date,completion_date,down_time_hours,created_at').eq('organization_id', context.organizationId).range(from, to)),
    fetchAll<WorkOrderCost>((from, to) => context.supabase.from('work_order_cost_summary').select('work_order_id,total_cost').eq('organization_id', context.organizationId).range(from, to)),
    canonical.from('asset_reconciliation').select('source_record_id,linked_asset_id').eq('organization_id', context.organizationId).eq('source_table', 'maintenance_assets'),
    fetchAll<PreventiveSchedule>((from, to) => context.supabase.from('preventive_maintenance_schedules').select('id,asset_id,canonical_asset_id,task_name,enabled,last_executed_date,next_scheduled_date').eq('organization_id', context.organizationId).range(from, to)),
    fetchAll<Sensor>((from, to) => context.supabase.from('sensors').select('id,canonical_asset_id').eq('organization_id', context.organizationId).range(from, to)),
    fetchAll<SensorReading>((from, to) => context.supabase.from('sensor_readings').select('id,sensor_id,canonical_asset_id,timestamp').eq('organization_id', context.organizationId).range(from, to)),
    fetchAll<TelemetryEvent>((from, to) => context.supabase.from('telemetry_condition_events').select('id,sensor_id,canonical_asset_id,event_at,severity').eq('organization_id', context.organizationId).range(from, to)),
  ]);
  if (reconciliationsResult.error) throw new Error(reconciliationsResult.error.message);
  return { workOrders, costs, reconciliations: (reconciliationsResult.data || []) as Reconciliation[], preventiveSchedules, sensors, sensorReadings, telemetryEvents };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const canonical = context.supabase.schema('canonical');

  try {
    const [decisions, validations, assetsResult] = await Promise.all([
      fetchAll<CommissioningDecision>((from, to) => context.supabase.from('asset_renewal_commissioning_decisions').select('id,initiative_id,previous_asset_id,replacement_asset_id,decision_type,commissioning_date,reason,approved_at').eq('organization_id', context.organizationId).eq('status', 'approved').order('approved_at', { ascending: false }).range(from, to)),
      fetchAll<Validation>((from, to) => context.supabase.from('asset_renewal_post_commissioning_validations').select('id,commissioning_decision_id,previous_asset_id,evaluated_asset_id,baseline_start_date,baseline_end_date,post_start_date,post_end_date,result,status,reason,evidence_reference,evidence_snapshot,proposed_at,approved_at').eq('organization_id', context.organizationId).order('updated_at', { ascending: false }).range(from, to)),
      canonical.from('assets').select('id,asset_code,name,asset_type,is_active').eq('organization_id', context.organizationId).order('asset_code'),
    ]);
    if (assetsResult.error) throw new Error(assetsResult.error.message);
    const assets = (assetsResult.data || []) as Asset[];
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    const validationByDecision = new Map<string, Validation>();
    for (const validation of validations) if (!validationByDecision.has(validation.commissioning_decision_id) && ['proposed', 'approved'].includes(validation.status)) validationByDecision.set(validation.commissioning_decision_id, validation);
    const sources = decisions.length > 0 && validations.some((row) => ['proposed', 'approved'].includes(row.status)) ? await loadEvidenceSources(context) : null;

    const items = decisions.map((decision) => {
      const validation = validationByDecision.get(decision.id) || null;
      const evaluatedAssetId = decision.replacement_asset_id || decision.previous_asset_id;
      const evidence = validation && sources ? buildEvidence(validation, sources.workOrders, sources.costs, sources.reconciliations, sources.preventiveSchedules, sources.sensors, sources.sensorReadings, sources.telemetryEvents) : null;
      const eligibilityGaps: string[] = [];
      if (!decision.commissioning_date) eligibilityGaps.push('Falta fecha explícita de puesta en servicio');
      if (!assetById.get(decision.previous_asset_id)) eligibilityGaps.push('El activo anterior no está disponible en el modelo canónico');
      if (!assetById.get(evaluatedAssetId)) eligibilityGaps.push('El activo evaluado no está disponible en el modelo canónico');
      return {
        decision,
        previousAsset: assetById.get(decision.previous_asset_id) || null,
        evaluatedAsset: assetById.get(evaluatedAssetId) || null,
        validation,
        evidence,
        approvedEvidence: validation?.status === 'approved' ? validation.evidence_snapshot : null,
        eligibilityGaps,
        canPropose: eligibilityGaps.length === 0 && !validation,
      };
    });

    return NextResponse.json({
      counts: {
        approvedClosures: items.length,
        eligible: items.filter((row) => row.canPropose).length,
        proposed: items.filter((row) => row.validation?.status === 'proposed').length,
        approved: items.filter((row) => row.validation?.status === 'approved').length,
        withoutCommissioningDate: items.filter((row) => !row.decision.commissioning_date).length,
        withEvidenceGaps: items.filter((row) => (row.evidence?.gaps.length || row.eligibilityGaps.length) > 0).length,
      },
      items,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la validación post-puesta en servicio.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const commissioningDecisionId = text(body?.commissioningDecisionId);
  const baselineStart = text(body?.baselineStart);
  const baselineEnd = text(body?.baselineEnd);
  const postStart = text(body?.postStart);
  const postEnd = text(body?.postEnd);
  const result = text(body?.result);
  const reason = text(body?.reason);
  const evidenceReference = text(body?.evidenceReference) || null;
  if (!commissioningDecisionId || !['satisfactory', 'requires_follow_up', 'insufficient_evidence'].includes(result) || !reason) return NextResponse.json({ error: 'Completa cierre, resultado y fundamento.' }, { status: 400 });

  const { data: decision } = await context.supabase.from('asset_renewal_commissioning_decisions').select('id,previous_asset_id,replacement_asset_id,status,commissioning_date').eq('organization_id', context.organizationId).eq('id', commissioningDecisionId).maybeSingle();
  if (!decision || decision.status !== 'approved') return NextResponse.json({ error: 'Solo un cierre aprobado puede pasar a validación post-puesta en servicio.' }, { status: 409 });
  if (!decision.commissioning_date) return NextResponse.json({ error: 'El cierre aprobado no tiene una fecha explícita de puesta en servicio.' }, { status: 409 });
  const windowError = validateWindows(decision.commissioning_date, baselineStart, baselineEnd, postStart, postEnd);
  if (windowError) return NextResponse.json({ error: windowError }, { status: 400 });

  const evaluatedAssetId = decision.replacement_asset_id || decision.previous_asset_id;
  const canonical = context.supabase.schema('canonical');
  const [{ data: previousAsset }, { data: evaluatedAsset }, { data: existing }] = await Promise.all([
    canonical.from('assets').select('id').eq('organization_id', context.organizationId).eq('id', decision.previous_asset_id).maybeSingle(),
    canonical.from('assets').select('id').eq('organization_id', context.organizationId).eq('id', evaluatedAssetId).maybeSingle(),
    context.supabase.from('asset_renewal_post_commissioning_validations').select('id,status').eq('organization_id', context.organizationId).eq('commissioning_decision_id', decision.id).in('status', ['proposed', 'approved']).maybeSingle(),
  ]);
  if (!previousAsset || !evaluatedAsset) return NextResponse.json({ error: 'No se pudieron verificar los activos canónicos de la comparación.' }, { status: 409 });
  if (existing) return NextResponse.json({ error: 'El cierre ya tiene una validación post-puesta en servicio activa.' }, { status: 409 });

  const { data, error } = await context.supabase.from('asset_renewal_post_commissioning_validations').insert({
    organization_id: context.organizationId,
    commissioning_decision_id: decision.id,
    previous_asset_id: decision.previous_asset_id,
    evaluated_asset_id: evaluatedAssetId,
    baseline_start_date: baselineStart,
    baseline_end_date: baselineEnd,
    post_start_date: postStart,
    post_end_date: postEnd,
    result,
    status: 'proposed',
    reason,
    evidence_reference: evidenceReference,
    proposed_by: context.userId,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'El cierre ya tiene una validación activa.' : error.message }, { status: error.code === '23505' ? 409 : 500 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const id = text(body?.id);
  const status = text(body?.status);
  if (!id || !['approved', 'rejected', 'inactive'].includes(status)) return NextResponse.json({ error: 'Estado de validación inválido.' }, { status: 400 });

  const { data: validation } = await context.supabase.from('asset_renewal_post_commissioning_validations').select('id,commissioning_decision_id,previous_asset_id,evaluated_asset_id,baseline_start_date,baseline_end_date,post_start_date,post_end_date,result,status,reason,evidence_reference,evidence_snapshot,proposed_at,approved_at').eq('organization_id', context.organizationId).eq('id', id).maybeSingle();
  if (!validation) return NextResponse.json({ error: 'Validación no encontrada.' }, { status: 404 });
  if (status === 'approved' && validation.status !== 'proposed') return NextResponse.json({ error: 'Solo una validación propuesta puede aprobarse.' }, { status: 409 });

  const now = new Date().toISOString();
  if (status === 'approved') {
    const { data: decision } = await context.supabase.from('asset_renewal_commissioning_decisions').select('id,status,commissioning_date').eq('organization_id', context.organizationId).eq('id', validation.commissioning_decision_id).maybeSingle();
    if (!decision || decision.status !== 'approved' || !decision.commissioning_date) return NextResponse.json({ error: 'El cierre aprobado asociado ya no está disponible para validación.' }, { status: 409 });
    const windowError = validateWindows(decision.commissioning_date, validation.baseline_start_date, validation.baseline_end_date, validation.post_start_date, validation.post_end_date);
    if (windowError) return NextResponse.json({ error: windowError }, { status: 409 });
    const sources = await loadEvidenceSources(context);
    const evidence = buildEvidence(validation, sources.workOrders, sources.costs, sources.reconciliations, sources.preventiveSchedules, sources.sensors, sources.sensorReadings, sources.telemetryEvents);
    if (validation.result === 'satisfactory' && evidence.comparableSources.length === 0) return NextResponse.json({ error: 'No se puede aprobar un resultado satisfactorio sin al menos una fuente comparable registrada en ambos períodos.' }, { status: 409 });
    const { error } = await context.supabase.from('asset_renewal_post_commissioning_validations').update({ status: 'approved', evidence_snapshot: evidence, approved_by: context.userId, approved_at: now, updated_at: now }).eq('organization_id', context.organizationId).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, evidence });
  }

  const { error } = await context.supabase.from('asset_renewal_post_commissioning_validations').update({ status, approved_by: null, approved_at: null, updated_at: now }).eq('organization_id', context.organizationId).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
