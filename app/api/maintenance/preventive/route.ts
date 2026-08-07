export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [schedulesResult, assetsResult] = await Promise.all([
      context.supabase
        .from('preventive_maintenance_schedules')
        .select('id, asset_id, canonical_asset_id, task_name, description, frequency_days, frequency_hours, last_executed_date, next_scheduled_date, estimated_duration_hours, priority, enabled, generated_work_order_id, last_generated_at, created_at')
        .eq('organization_id', context.organizationId)
        .order('next_scheduled_date', { ascending: true, nullsFirst: false }),
      context.supabase
        .from('maintenance_assets')
        .select('id, asset_code, asset_name, asset_type, location, status, manufacturer, model, criticality')
        .eq('organization_id', context.organizationId)
        .order('asset_code'),
    ]);

    const firstError = schedulesResult.error || assetsResult.error;
    if (firstError) throw firstError;

    const assets = assetsResult.data || [];
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    const schedules = (schedulesResult.data || []).map((schedule) => ({
      ...schedule,
      asset: assetsById.get(schedule.asset_id) || null,
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inThirtyDays = new Date(today);
    inThirtyDays.setDate(inThirtyDays.getDate() + 30);

    const summary = schedules.reduce((totals, schedule) => {
      totals.total += 1;
      if (!schedule.enabled) totals.disabled += 1;
      if (schedule.generated_work_order_id) totals.generated += 1;
      if (schedule.next_scheduled_date) {
        const due = new Date(`${schedule.next_scheduled_date}T00:00:00`);
        if (due < today) totals.overdue += 1;
        else if (due <= inThirtyDays) totals.dueSoon += 1;
      }
      return totals;
    }, { total: 0, overdue: 0, dueSoon: 0, disabled: 0, generated: 0 });

    return NextResponse.json({ schedules, assets, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la planificación preventiva';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const assetId = String(body.assetId || '');
    const taskName = String(body.taskName || '').trim();
    const nextScheduledDate = String(body.nextScheduledDate || '');
    const frequencyDays = body.frequencyDays ? Number(body.frequencyDays) : null;
    const frequencyHours = body.frequencyHours ? Number(body.frequencyHours) : null;

    if (!assetId || !taskName || !nextScheduledDate) {
      return NextResponse.json({ error: 'Equipo, tarea y próxima fecha son obligatorios.' }, { status: 400 });
    }
    if (!frequencyDays && !frequencyHours) {
      return NextResponse.json({ error: 'Define una frecuencia por días o por horas.' }, { status: 400 });
    }

    const { data: asset, error: assetError } = await context.supabase
      .from('maintenance_assets')
      .select('id, asset_code')
      .eq('organization_id', context.organizationId)
      .eq('id', assetId)
      .maybeSingle();
    if (assetError) throw assetError;
    if (!asset) return NextResponse.json({ error: 'Equipo no encontrado.' }, { status: 404 });

    const { data: canonicalAsset } = await context.supabase
      .schema('canonical')
      .from('assets')
      .select('id')
      .eq('organization_id', context.organizationId)
      .eq('asset_code', asset.asset_code)
      .maybeSingle();

    const { data, error } = await context.supabase
      .from('preventive_maintenance_schedules')
      .insert({
        organization_id: context.organizationId,
        asset_id: assetId,
        canonical_asset_id: canonicalAsset?.id || null,
        task_name: taskName,
        description: String(body.description || '').trim() || null,
        frequency_days: frequencyDays,
        frequency_hours: frequencyHours,
        next_scheduled_date: nextScheduledDate,
        estimated_duration_hours: body.estimatedDurationHours ? Number(body.estimatedDurationHours) : null,
        priority: String(body.priority || 'medium'),
        enabled: true,
      })
      .select('id')
      .single();
    if (error) throw error;

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el plan preventivo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const scheduleId = String(body.scheduleId || '');
    const action = String(body.action || '');
    if (!scheduleId) return NextResponse.json({ error: 'Plan no identificado.' }, { status: 400 });

    if (action === 'toggle') {
      const { data: schedule, error: readError } = await context.supabase
        .from('preventive_maintenance_schedules')
        .select('enabled')
        .eq('organization_id', context.organizationId)
        .eq('id', scheduleId)
        .maybeSingle();
      if (readError) throw readError;
      if (!schedule) return NextResponse.json({ error: 'Plan no encontrado.' }, { status: 404 });
      const { error } = await context.supabase
        .from('preventive_maintenance_schedules')
        .update({ enabled: !schedule.enabled, updated_at: new Date().toISOString() })
        .eq('organization_id', context.organizationId)
        .eq('id', scheduleId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'generate') {
      const { data, error } = await context.supabase.rpc('create_work_order_from_schedule', {
        p_schedule_id: scheduleId,
        p_created_by: context.userId,
      });
      if (error) throw error;
      return NextResponse.json({ workOrderId: data });
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el plan preventivo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
