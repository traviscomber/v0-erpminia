import { cookies } from 'next/headers';
import { verifyAuthCookieValue } from '@/lib/auth-cookie';

type AuthCookiePayload = {
  user?: {
    id?: string;
    email?: string;
    full_name?: string;
    organization_id?: string;
  };
  role?: string;
  session_token?: string;
};

export function normalizeMaintenanceStatus(status?: string | null) {
  switch (String(status || '').trim().toLowerCase()) {
    case 'pendiente':
    case 'open':
      return 'open';
    case 'en_progreso':
    case 'in_progress':
      return 'in_progress';
    case 'completada':
    case 'completed':
      return 'completed';
    case 'cancelada':
    case 'cancelled':
      return 'cancelled';
    default:
      return 'open';
  }
}

export function normalizeMaintenancePriority(priority?: string | null) {
  switch (String(priority || '').trim().toLowerCase()) {
    case 'baja':
    case 'low':
      return 'low';
    case 'alta':
    case 'high':
      return 'high';
    case 'critica':
    case 'crítica':
    case 'critica_seguridad':
    case 'critical':
      return 'critical';
    case 'media':
    case 'medium':
    default:
      return 'medium';
  }
}

export function normalizeMaintenanceType(workType?: string | null) {
  switch (String(workType || '').trim().toLowerCase()) {
    case 'preventiva':
    case 'preventive':
      return 'preventive';
    case 'predictiva':
    case 'predictive':
      return 'predictive';
    case 'correctiva':
    case 'corrective':
    default:
      return 'corrective';
  }
}

export function toLegacyMaintenanceStatus(status?: string | null) {
  switch (String(status || '').trim().toLowerCase()) {
    case 'open':
      return 'pendiente';
    case 'in_progress':
      return 'en_progreso';
    case 'completed':
      return 'completada';
    case 'cancelled':
      return 'cancelada';
    default:
      return status || 'pendiente';
  }
}

export function toLegacyMaintenancePriority(priority?: string | null) {
  switch (String(priority || '').trim().toLowerCase()) {
    case 'low':
      return 'baja';
    case 'high':
      return 'alta';
    case 'critical':
      return 'critica_seguridad';
    case 'medium':
      return 'media';
    default:
      return priority || 'media';
  }
}

export function toLegacyMaintenanceType(workType?: string | null) {
  switch (String(workType || '').trim().toLowerCase()) {
    case 'preventive':
      return 'preventiva';
    case 'predictive':
      return 'predictiva';
    case 'corrective':
      return 'correctiva';
    default:
      return workType || 'correctiva';
  }
}

export function mapMaintenanceWorkOrderToLegacy(row: any) {
  const status = toLegacyMaintenanceStatus(row.status);
  return {
    id: row.id,
    order_number: row.work_order_number || row.order_number || `MO-${row.id}`,
    title: row.title || 'Orden de mantenimiento',
    description: row.description || row.issue_description || '',
    vehicle_id: row.asset_id || row.vehicle_id || row.equipment_id || null,
    asset_id: row.asset_id || row.vehicle_id || row.equipment_id || null,
    status,
    priority: toLegacyMaintenancePriority(row.priority),
    maintenance_type: toLegacyMaintenanceType(row.work_type || row.maintenance_type || row.order_type),
    progress_percentage:
      status === 'completada' ? 100 : status === 'en_progreso' ? 50 : 0,
    estimated_hours: Number(row.planned_duration_hours || row.estimated_hours || 0),
    actual_hours: row.actual_duration_hours != null ? Number(row.actual_duration_hours) : undefined,
    estimated_cost: Number(row.estimated_cost || 0),
    actual_cost: row.actual_cost != null ? Number(row.actual_cost) : undefined,
    technician_name: row.assigned_to_name || row.technician_name || null,
    created_at: row.created_at,
    start_date: row.start_date || null,
    scheduled_date: row.scheduled_date || null,
    completion_date: row.completion_date || null,
  };
}

export async function resolveMaintenanceOrganizationId(
  supabase: any,
  assetId?: string | null
) {
  if (assetId) {
    const { data: asset } = await supabase
      .from('maintenance_assets')
      .select('organization_id')
      .eq('id', assetId)
      .maybeSingle();

    if (asset?.organization_id) {
      return asset.organization_id as string;
    }
  }

  return null;
}

export async function getMaintenanceActionAuthContext() {
  const cookieStore = await cookies();
  const raw = cookieStore.get('auth_token')?.value;

  if (!raw) {
    return { organizationId: null, userId: null, role: null };
  }

  try {
    const parsed = await verifyAuthCookieValue(raw);
    if (!parsed) {
      return { organizationId: null, userId: null, role: null };
    }
    return {
      organizationId: parsed.user?.organization_id || null,
      userId: parsed.user?.id || null,
      role: parsed.role || null,
    };
  } catch {
    return { organizationId: null, userId: null, role: null };
  }
}

export function buildCreateMaintenanceWorkOrderPayload(input: Record<string, any>) {
  const assetId =
    input.asset_id ||
    input.assetId ||
    input.vehicle_id ||
    input.equipment_id ||
    null;

  return {
    asset_id: assetId,
    work_order_number: input.work_order_number || input.order_number || null,
    title: input.title || 'Orden de mantenimiento',
    description: input.description || input.issue_description || null,
    work_type: normalizeMaintenanceType(input.work_type || input.workType || input.maintenance_type || input.order_type),
    status: normalizeMaintenanceStatus(input.status),
    priority: normalizeMaintenancePriority(input.priority),
    scheduled_date: input.scheduled_date || input.scheduledDate || null,
    start_date: input.start_date || null,
    completion_date: input.completion_date || null,
    planned_duration_hours:
      input.planned_duration_hours ??
      input.plannedDurationHours ??
      input.estimated_hours ??
      null,
    actual_duration_hours: input.actual_duration_hours ?? input.actual_hours ?? null,
    assigned_to_name: input.assigned_to_name || input.technician_name || null,
    root_cause: input.root_cause || null,
    preventive_actions: input.preventive_actions || null,
    updated_at: new Date().toISOString(),
  };
}

export function buildUpdateMaintenanceWorkOrderPayload(input: Record<string, any>) {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if ('asset_id' in input || 'assetId' in input || 'vehicle_id' in input || 'equipment_id' in input) {
    payload.asset_id =
      input.asset_id ??
      input.assetId ??
      input.vehicle_id ??
      input.equipment_id ??
      null;
  }

  if ('work_order_number' in input || 'order_number' in input) {
    payload.work_order_number = input.work_order_number ?? input.order_number ?? null;
  }

  if ('title' in input) payload.title = input.title;
  if ('description' in input || 'issue_description' in input) {
    payload.description = input.description ?? input.issue_description ?? null;
  }
  if ('work_type' in input || 'workType' in input || 'maintenance_type' in input || 'order_type' in input) {
    payload.work_type = normalizeMaintenanceType(
      input.work_type || input.workType || input.maintenance_type || input.order_type
    );
  }
  if ('status' in input) payload.status = normalizeMaintenanceStatus(input.status);
  if ('priority' in input) payload.priority = normalizeMaintenancePriority(input.priority);
  if ('scheduled_date' in input || 'scheduledDate' in input) {
    payload.scheduled_date = input.scheduled_date ?? input.scheduledDate ?? null;
  }
  if ('start_date' in input) payload.start_date = input.start_date ?? null;
  if ('completion_date' in input) payload.completion_date = input.completion_date ?? null;
  if ('planned_duration_hours' in input || 'plannedDurationHours' in input || 'estimated_hours' in input) {
    payload.planned_duration_hours =
      input.planned_duration_hours ??
      input.plannedDurationHours ??
      input.estimated_hours ??
      null;
  }
  if ('actual_duration_hours' in input || 'actual_hours' in input) {
    payload.actual_duration_hours = input.actual_duration_hours ?? input.actual_hours ?? null;
  }
  if ('assigned_to_name' in input || 'technician_name' in input) {
    payload.assigned_to_name = input.assigned_to_name ?? input.technician_name ?? null;
  }
  if ('root_cause' in input) payload.root_cause = input.root_cause ?? null;
  if ('preventive_actions' in input) payload.preventive_actions = input.preventive_actions ?? null;

  return payload;
}
