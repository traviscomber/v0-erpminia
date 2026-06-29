export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type MaintenanceAssetRow = {
  asset_code: string | null;
  asset_name: string | null;
  asset_type: string | null;
  location: string | null;
  status: string | null;
  criticality: string | null;
};

type PreventiveScheduleRow = {
  id: string;
  asset_id: string | null;
  task_name: string | null;
  description: string | null;
  frequency_days: number | string | null;
  frequency_hours: number | string | null;
  last_executed_date: string | null;
  next_scheduled_date: string | null;
  estimated_duration_hours: number | string | null;
  priority: string | null;
  enabled: boolean | null;
  asset?: MaintenanceAssetRow | null;
};

type PreventiveScheduleItem = {
  id: string;
  assetId: string | null;
  assetCode: string | null;
  assetName: string;
  assetType: string | null;
  location: string | null;
  criticality: string | null;
  taskName: string | null;
  description: string | null;
  frequencyDays: number | string | null;
  frequencyHours: number | string | null;
  lastExecutedDate: string | null;
  nextScheduledDate: string | null;
  estimatedDurationHours: number | string | null;
  priority: string;
  enabled: boolean;
  daysUntil: number | null;
};

function toDateOnly(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

function calculateDaysUntil(dateString?: string | null) {
  if (!dateString) return null;
  const dueDate = new Date(dateString);
  if (Number.isNaN(dueDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const searchParams = new URL(request.url).searchParams;
    const days = Number(searchParams.get('days') || '365');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + (Number.isFinite(days) ? days : 365));

    const { data, error } = await context.supabase
      .from('preventive_maintenance_schedules')
      .select(`
        id,
        organization_id,
        asset_id,
        task_name,
        description,
        frequency_days,
        frequency_hours,
        last_executed_date,
        next_scheduled_date,
        estimated_duration_hours,
        priority,
        enabled,
        created_at,
        updated_at,
        asset:maintenance_assets(
          id,
          asset_code,
          asset_name,
          asset_type,
          location,
          status,
          criticality
        )
      `)
      .eq('organization_id', context.organizationId)
      .order('next_scheduled_date', { ascending: true })
      .limit(250);

    if (error) throw error;

    const schedules = (Array.isArray(data) ? (data as PreventiveScheduleRow[]) : [])
      .map<PreventiveScheduleItem>((schedule) => {
        const nextScheduledDate = toDateOnly(schedule.next_scheduled_date);
        const daysUntil = calculateDaysUntil(nextScheduledDate);
        return {
          id: schedule.id,
          assetId: schedule.asset_id,
          assetCode: schedule.asset?.asset_code || null,
          assetName: schedule.asset?.asset_name || 'Sin activo',
          assetType: schedule.asset?.asset_type || null,
          location: schedule.asset?.location || null,
          criticality: schedule.asset?.criticality || null,
          taskName: schedule.task_name,
          description: schedule.description || null,
          frequencyDays: schedule.frequency_days || null,
          frequencyHours: schedule.frequency_hours || null,
          lastExecutedDate: toDateOnly(schedule.last_executed_date),
          nextScheduledDate,
          estimatedDurationHours: schedule.estimated_duration_hours || null,
          priority: schedule.priority || 'medium',
          enabled: Boolean(schedule.enabled),
          daysUntil,
        };
      })
      .filter((schedule) => {
        if (!schedule.nextScheduledDate) return true;
        const dueDate = new Date(schedule.nextScheduledDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate <= futureDate;
      });

    const enabledSchedules = schedules.filter((schedule) => schedule.enabled);
    const overdue = enabledSchedules.filter((schedule) => (schedule.daysUntil ?? 9999) < 0).length;
    const dueSoon = enabledSchedules.filter((schedule) => (schedule.daysUntil ?? 9999) >= 0 && (schedule.daysUntil ?? 9999) <= 30).length;

    return NextResponse.json({
      schedules,
      summary: {
        total: schedules.length,
        enabled: enabledSchedules.length,
        overdue,
        dueSoon,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la planificacion preventiva';
    return NextResponse.json({ schedules: [], summary: { total: 0, enabled: 0, overdue: 0, dueSoon: 0 }, error: message }, { status: 500 });
  }
}
