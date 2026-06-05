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

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return org?.id || null;
}

export function buildMaintenanceWorkOrderPayload(input: Record<string, any>) {
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
