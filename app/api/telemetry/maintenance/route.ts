export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function text(value: unknown) { return String(value ?? '').trim(); }

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const canonical = context.supabase.schema('canonical');

  const [equipmentResult, sensorResult, linkResult, eventResult, assetResult, preventiveResult, workOrderResult] = await Promise.all([
    context.supabase.from('equipment').select('id, code, name, type, model, manufacturer, status, criticality').order('name').limit(500),
    context.supabase.from('sensors').select('id, equipment_id, sensor_code, name, type, unit, min_threshold, max_threshold, alarm_threshold, critical_threshold, last_reading, last_reading_at, status, organization_id, canonical_asset_id').order('name').limit(1000),
    context.supabase.from('telemetry_asset_links').select('id, legacy_equipment_id, canonical_asset_id, match_method, verified_at').eq('organization_id', context.organizationId).limit(500),
    context.supabase.from('telemetry_condition_events').select('id, sensor_id, reading_id, legacy_equipment_id, canonical_asset_id, condition_type, severity, observed_value, threshold_value, unit, event_at, status, preventive_schedule_id, work_order_id, acknowledged_at, resolved_at, resolution_note').eq('organization_id', context.organizationId).order('event_at', { ascending: false }).limit(300),
    canonical.from('assets').select('id, asset_code, name, asset_type, category, is_active').eq('organization_id', context.organizationId).eq('is_active', true).order('name').limit(1000),
    context.supabase.from('preventive_maintenance_schedules').select('id, canonical_asset_id, task_name, priority, enabled, next_scheduled_date').eq('organization_id', context.organizationId).eq('enabled', true).order('next_scheduled_date').limit(500),
    context.supabase.from('maintenance_work_orders').select('id, canonical_asset_id, work_order_number, title, status, priority').eq('organization_id', context.organizationId).order('updated_at', { ascending: false }).limit(500),
  ]);

  const errors = [equipmentResult, sensorResult, linkResult, eventResult, assetResult, preventiveResult, workOrderResult].filter((result) => result.error);
  if (errors.length) return NextResponse.json({ error: 'No se pudo cargar la telemetría conectada a mantenimiento.' }, { status: 500 });

  const links = linkResult.data || [];
  const linkedEquipmentIds = new Set(links.map((row: any) => row.legacy_equipment_id));
  const sensors = (sensorResult.data || []).filter((row: any) => !row.organization_id || row.organization_id === context.organizationId || linkedEquipmentIds.has(row.equipment_id));

  return NextResponse.json({
    equipment: equipmentResult.data || [], sensors, links,
    events: eventResult.data || [], assets: assetResult.data || [],
    preventive: preventiveResult.data || [], workOrders: workOrderResult.data || [],
    source: 'canonical',
  });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const action = text(body?.action);
  const canonical = context.supabase.schema('canonical');

  if (action === 'link_equipment') {
    const equipmentId = text(body?.equipmentId); const canonicalAssetId = text(body?.canonicalAssetId);
    if (!equipmentId || !canonicalAssetId) return NextResponse.json({ error: 'Selecciona el equipo de telemetría y el equipo canónico.' }, { status: 400 });
    const [{ data: equipment }, { data: asset }] = await Promise.all([
      context.supabase.from('equipment').select('id, code, name').eq('id', equipmentId).maybeSingle(),
      canonical.from('assets').select('id, asset_code, name').eq('organization_id', context.organizationId).eq('id', canonicalAssetId).maybeSingle(),
    ]);
    if (!equipment || !asset) return NextResponse.json({ error: 'No fue posible verificar ambos equipos.' }, { status: 400 });
    const now = new Date().toISOString();
    const { error } = await context.supabase.from('telemetry_asset_links').upsert({ organization_id: context.organizationId, legacy_equipment_id: equipmentId, canonical_asset_id: canonicalAssetId, match_method: 'manual', verified_by: context.userId, verified_at: now, updated_at: now }, { onConflict: 'organization_id,legacy_equipment_id' });
    if (error) return NextResponse.json({ error: 'No se pudo guardar la vinculación.' }, { status: 500 });
    const { data: sensorRows } = await context.supabase.from('sensors').select('id').eq('equipment_id', equipmentId);
    const sensorIds = (sensorRows || []).map((row: any) => row.id);
    if (sensorIds.length) {
      await context.supabase.from('sensors').update({ organization_id: context.organizationId, canonical_asset_id: canonicalAssetId, updated_at: now }).in('id', sensorIds);
      await context.supabase.from('sensor_readings').update({ organization_id: context.organizationId, canonical_asset_id: canonicalAssetId }).in('sensor_id', sensorIds).is('organization_id', null);
    }
    return NextResponse.json({ ok: true, linkedSensors: sensorIds.length });
  }

  const eventId = text(body?.eventId);
  if (!eventId) return NextResponse.json({ error: 'Selecciona una condición de telemetría.' }, { status: 400 });
  const { data: event } = await context.supabase.from('telemetry_condition_events').select('id, canonical_asset_id, sensor_id, observed_value, threshold_value, unit, event_at, severity, condition_type, status, work_order_id').eq('organization_id', context.organizationId).eq('id', eventId).maybeSingle();
  if (!event) return NextResponse.json({ error: 'La condición no pertenece a la organización activa.' }, { status: 404 });

  if (action === 'link_preventive') {
    const scheduleId = text(body?.scheduleId);
    const { data: schedule } = await context.supabase.from('preventive_maintenance_schedules').select('id, canonical_asset_id').eq('organization_id', context.organizationId).eq('id', scheduleId).maybeSingle();
    if (!schedule || schedule.canonical_asset_id !== event.canonical_asset_id) return NextResponse.json({ error: 'El plan preventivo debe pertenecer al mismo equipo.' }, { status: 400 });
    const { error } = await context.supabase.from('telemetry_condition_events').update({ preventive_schedule_id: scheduleId, updated_at: new Date().toISOString() }).eq('organization_id', context.organizationId).eq('id', eventId);
    return error ? NextResponse.json({ error: 'No se pudo vincular el plan.' }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (action === 'link_work_order') {
    const workOrderId = text(body?.workOrderId);
    const { data: workOrder } = await context.supabase.from('maintenance_work_orders').select('id, canonical_asset_id').eq('organization_id', context.organizationId).eq('id', workOrderId).maybeSingle();
    if (!workOrder || workOrder.canonical_asset_id !== event.canonical_asset_id) return NextResponse.json({ error: 'La OT debe pertenecer al mismo equipo.' }, { status: 400 });
    const { error } = await context.supabase.from('telemetry_condition_events').update({ work_order_id: workOrderId, updated_at: new Date().toISOString() }).eq('organization_id', context.organizationId).eq('id', eventId);
    return error ? NextResponse.json({ error: 'No se pudo vincular la OT.' }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (action === 'create_work_order') {
    if (event.work_order_id) return NextResponse.json({ error: 'Esta condición ya está vinculada a una OT.' }, { status: 400 });
    const { data: sensor } = await context.supabase.from('sensors').select('sensor_code, name, unit').eq('id', event.sensor_id).maybeSingle();
    const sensorLabel = sensor?.name || sensor?.sensor_code || 'sensor';
    const priority = event.severity === 'critical' ? 'critical' : 'high';
    const { data: workOrder, error } = await context.supabase.from('maintenance_work_orders').insert({ organization_id: context.organizationId, canonical_asset_id: event.canonical_asset_id, title: `Revisar condición de telemetría: ${sensorLabel}`, description: `Lectura registrada: ${event.observed_value} ${event.unit || sensor?.unit || ''}. Umbral configurado: ${event.threshold_value} ${event.unit || sensor?.unit || ''}. Fecha de lectura: ${event.event_at}. La OT solicita verificación de la condición; no constituye un diagnóstico automático.`, work_type: 'predictivo', status: 'open', priority, scheduled_date: new Date().toISOString().slice(0, 10), created_by: context.userId }).select('id, work_order_number, title').single();
    if (error || !workOrder) return NextResponse.json({ error: 'No se pudo crear la orden de trabajo.' }, { status: 500 });
    await context.supabase.from('telemetry_condition_events').update({ work_order_id: workOrder.id, updated_at: new Date().toISOString() }).eq('organization_id', context.organizationId).eq('id', eventId);
    return NextResponse.json({ ok: true, workOrder });
  }

  if (action === 'acknowledge') {
    if (event.status === 'resolved') return NextResponse.json({ error: 'La condición ya está resuelta.' }, { status: 400 });
    const now = new Date().toISOString();
    const { error } = await context.supabase.from('telemetry_condition_events').update({ status: 'acknowledged', acknowledged_by: context.userId, acknowledged_at: now, updated_at: now }).eq('organization_id', context.organizationId).eq('id', eventId);
    return error ? NextResponse.json({ error: 'No se pudo confirmar la revisión.' }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (action === 'resolve') {
    const note = text(body?.resolutionNote);
    if (!note) return NextResponse.json({ error: 'Describe la verificación o acción realizada.' }, { status: 400 });
    const now = new Date().toISOString();
    const { error } = await context.supabase.from('telemetry_condition_events').update({ status: 'resolved', resolved_by: context.userId, resolved_at: now, resolution_note: note, updated_at: now }).eq('organization_id', context.organizationId).eq('id', eventId);
    return error ? NextResponse.json({ error: 'No se pudo cerrar la condición.' }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
}
