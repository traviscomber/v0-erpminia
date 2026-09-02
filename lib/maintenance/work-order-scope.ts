type SupabaseLike = {
  from: (table: string) => any;
};

export type MaintenanceWorkOrderScope = 'operational' | 'historical' | 'missing';

export async function getMaintenanceWorkOrderScope(
  supabase: SupabaseLike,
  organizationId: string,
  workOrderId: string,
): Promise<MaintenanceWorkOrderScope> {
  const { data, error } = await supabase
    .from('maintenance_work_orders')
    .select('id,created_by')
    .eq('organization_id', organizationId)
    .eq('id', workOrderId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return 'missing';
  return data.created_by ? 'operational' : 'historical';
}

export async function requireOperationalMaintenanceWorkOrder(
  supabase: SupabaseLike,
  organizationId: string,
  workOrderId: string,
) {
  const scope = await getMaintenanceWorkOrderScope(supabase, organizationId, workOrderId);
  if (scope === 'missing') {
    return { ok: false as const, status: 404, error: 'No se encontró la orden de trabajo', scope };
  }
  if (scope === 'historical') {
    return {
      ok: false as const,
      status: 409,
      error: 'La OT pertenece al histórico importado y es de solo lectura.',
      scope,
    };
  }
  return { ok: true as const, scope };
}
