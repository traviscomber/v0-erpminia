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
  asset?: MaintenanceAssetRow[] | MaintenanceAssetRow | null;
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

  const DEMO_ORG = '550e8400-e29b-41d4-a716-446655440000';

  try {
    const searchParams = new URL(request.url).searchParams;
    const days = Number(searchParams.get('days') || '365');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + (Number.isFinite(days) ? days : 365));

    // Return mock preventive schedules for demo organization
    if (context.organizationId === DEMO_ORG) {
      const now = new Date();
      const mockSchedules: PreventiveScheduleItem[] = [
        {
          id: 'demo-pm-001',
          assetId: 'demo-asset-1',
          assetCode: 'EX-001',
          assetName: 'Excavadora CAT 320',
          assetType: 'Excavadora',
          location: 'Rajo Norte',
          criticality: 'Alta',
          taskName: 'Revisión preventiva mensual',
          description: 'Inspección de sistemas hidráulicos, motores y transmisión',
          frequencyDays: 30,
          frequencyHours: null,
          lastExecutedDate: new Date(now.getTime() - 15 * 86400000).toISOString().split('T')[0],
          nextScheduledDate: new Date(now.getTime() + 15 * 86400000).toISOString().split('T')[0],
          estimatedDurationHours: 4,
          priority: 'high',
          enabled: true,
          daysUntil: 15,
        },
        {
          id: 'demo-pm-002',
          assetId: 'demo-asset-2',
          assetCode: 'CF-001',
          assetName: 'Cargador CAT 980',
          assetType: 'Cargador Frontal',
          location: 'Botadero',
          criticality: 'Alta',
          taskName: 'Cambio de aceite y filtros',
          description: 'Cambio de aceite hidráulico, filtros de aire y combustible',
          frequencyDays: 60,
          frequencyHours: null,
          lastExecutedDate: new Date(now.getTime() - 45 * 86400000).toISOString().split('T')[0],
          nextScheduledDate: new Date(now.getTime() + 15 * 86400000).toISOString().split('T')[0],
          estimatedDurationHours: 2,
          priority: 'high',
          enabled: true,
          daysUntil: 15,
        },
        {
          id: 'demo-pm-003',
          assetId: 'demo-asset-3',
          assetCode: 'CT-001',
          assetName: 'Camión Tolva Volvo FMX',
          assetType: 'Camión Tolva',
          location: 'Ruta Interna',
          criticality: 'Media',
          taskName: 'Inspección trimestral de frenos',
          description: 'Inspección completa del sistema de frenos y pastillas',
          frequencyDays: 90,
          frequencyHours: null,
          lastExecutedDate: new Date(now.getTime() - 60 * 86400000).toISOString().split('T')[0],
          nextScheduledDate: new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0],
          estimatedDurationHours: 3,
          priority: 'medium',
          enabled: true,
          daysUntil: 30,
        },
        {
          id: 'demo-pm-004',
          assetId: 'demo-asset-4',
          assetCode: 'GE-001',
          assetName: 'Generador Kohler 250 kVA',
          assetType: 'Generador',
          location: 'Sala Eléctrica',
          criticality: 'Crítica',
          taskName: 'Prueba de carga semanal',
          description: 'Prueba de operación y carga del generador',
          frequencyDays: 7,
          frequencyHours: null,
          lastExecutedDate: new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0],
          nextScheduledDate: new Date(now.getTime() + 2 * 86400000).toISOString().split('T')[0],
          estimatedDurationHours: 1,
          priority: 'critical',
          enabled: true,
          daysUntil: 2,
        },
        {
          id: 'demo-pm-005',
          assetId: 'demo-asset-5',
          assetCode: 'PF-001',
          assetName: 'Perforadora Atlas Copco ROC',
          assetType: 'Perforadora',
          location: 'Zona Tronadura',
          criticality: 'Crítica',
          taskName: 'Mantenimiento preventivo bimensual',
          description: 'Revisión completa de sistemas neumáticos y eléctricos',
          frequencyDays: 60,
          frequencyHours: null,
          lastExecutedDate: new Date(now.getTime() - 70 * 86400000).toISOString().split('T')[0],
          nextScheduledDate: new Date(now.getTime() + 20 * 86400000).toISOString().split('T')[0],
          estimatedDurationHours: 6,
          priority: 'high',
          enabled: true,
          daysUntil: -10,
        },
      ];

      const enabledSchedules = mockSchedules.filter((schedule) => schedule.enabled);
      const overdue = enabledSchedules.filter((schedule) => (schedule.daysUntil ?? 9999) < 0).length;
      const dueSoon = enabledSchedules.filter((schedule) => (schedule.daysUntil ?? 9999) >= 0 && (schedule.daysUntil ?? 9999) <= 30).length;

      return NextResponse.json({
        schedules: mockSchedules,
        summary: {
          total: mockSchedules.length,
          enabled: enabledSchedules.length,
          overdue,
          dueSoon,
        },
        generated_at: new Date().toISOString(),
      });
    }

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

    const schedules = (Array.isArray(data) ? (data as unknown as PreventiveScheduleRow[]) : [])
      .map<PreventiveScheduleItem>((schedule) => {
        const nextScheduledDate = toDateOnly(schedule.next_scheduled_date);
        const daysUntil = calculateDaysUntil(nextScheduledDate);
        const asset = Array.isArray(schedule.asset) ? schedule.asset[0] || null : schedule.asset;
        return {
          id: schedule.id,
          assetId: schedule.asset_id,
          assetCode: asset?.asset_code || null,
          assetName: asset?.asset_name || 'Sin activo',
          assetType: asset?.asset_type || null,
          location: asset?.location || null,
          criticality: asset?.criticality || null,
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
