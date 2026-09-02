export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type ActionItem = {
  id: string;
  kind: string;
  priority: number;
  title: string;
  description: string;
  evidence: string;
  href: string;
  assetHref?: string | null;
};

const assetHref = (assetId: unknown) => assetId ? `/dashboard/mantenimiento/equipos/${encodeURIComponent(String(assetId))}/ficha` : null;

const isOutOfServiceReview = (row: any) => {
  const reason = String(row.review_reason || '').toLowerCase();
  const status = String(row.equipment_status_raw || '').toLowerCase();
  return reason === 'out_of_service' || status.includes('fuera de servicio');
};

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [closeResult, preventiveResult, reliabilityResult, operationalOrdersResult, drillingReviewResult] = await Promise.all([
      context.supabase.from('work_order_close_readiness_v2').select('*').eq('organization_id', context.organizationId),
      context.supabase.from('preventive_maintenance_hour_status_v1').select('*').eq('organization_id', context.organizationId),
      context.supabase.from('maintenance_reliability_by_asset_v1').select('canonical_asset_id,asset_code,asset_name,audited_closures,recurring_cause_count,max_same_cause_occurrences,has_recurring_root_cause').eq('organization_id', context.organizationId),
      context.supabase.from('maintenance_work_orders').select('id').eq('organization_id', context.organizationId).not('created_by', 'is', null).neq('status', 'completed'),
      context.supabase.from('drilling_maintenance_review_queue_v1').select('review_id,canonical_asset_id,asset_code,asset_name,operation_date,review_reason,equipment_status_raw,machine_observations,review_status,linked_work_order_id,has_linked_work_order').eq('organization_id', context.organizationId).eq('review_status', 'pending').eq('has_linked_work_order', false).order('operation_date', { ascending: true }).limit(50),
    ]);
    const error = closeResult.error || preventiveResult.error || reliabilityResult.error || operationalOrdersResult.error || drillingReviewResult.error;
    if (error) throw error;

    const operationalWorkOrderIds = new Set((operationalOrdersResult.data || []).map((row:any) => String(row.id)));
    const allCloseRows = closeResult.data || [];
    const closeRows = allCloseRows.filter((row:any) => operationalWorkOrderIds.has(String(row.work_order_id)));
    const preventiveRows = preventiveResult.data || [];
    const reliabilityRows = reliabilityResult.data || [];
    const drillingReviewRows = drillingReviewResult.data || [];
    const actions: ActionItem[] = [];

    for (const row of drillingReviewRows) {
      const outOfService = isOutOfServiceReview(row);
      const equipment = row.asset_code || row.asset_name || 'Equipo';
      const observation = String(row.machine_observations || row.review_reason || 'Observación operacional pendiente de revisión').trim();
      const dateEvidence = row.operation_date ? ` · ${row.operation_date}` : '';
      const reviewPriority = outOfService ? 'critical' : 'high';
      actions.push({
        id: `operational-review:${row.review_id}`,
        kind: 'operational_review',
        priority: outOfService ? 5 : 15,
        title: `${outOfService ? 'Equipo fuera de servicio' : 'Revisar señal operacional'} · ${equipment}`,
        description: `${row.asset_name || equipment} · ${row.equipment_status_raw || 'Observación de terreno'}`,
        evidence: `${observation}${dateEvidence}`,
        href: `/dashboard/mantenimiento/ordenes-trabajo/create?reviewId=${encodeURIComponent(String(row.review_id))}&workType=corrective&priority=${reviewPriority}`,
        assetHref: assetHref(row.canonical_asset_id),
      });
    }

    for (const row of preventiveRows) {
      if (row.hour_status === 'overdue' && !row.generated_work_order_id) {
        const overdueHours = Math.abs(Number(row.remaining_hours || 0));
        actions.push({
          id: `preventive:${row.schedule_id}`,
          kind: 'preventive_overdue',
          priority: 10,
          title: `Planificar preventivo vencido · ${row.task_name || 'Pauta'}`,
          description: `${row.asset_code || 'Equipo'} · ${row.asset_name || 'Sin nombre'}`,
          evidence: `${overdueHours.toLocaleString('es-CL')} h vencidas · frecuencia ${Number(row.frequency_hours || 0).toLocaleString('es-CL')} h`,
          href: '/dashboard/mantenimiento/preventivo-horas',
          assetHref: assetHref(row.canonical_asset_id),
        });
      } else if (row.hour_status === 'needs_review') {
        actions.push({
          id: `meter-review:${row.schedule_id}`,
          kind: 'meter_review',
          priority: 20,
          title: `Revisar base de horómetro · ${row.task_name || 'Pauta'}`,
          description: `${row.asset_code || 'Equipo'} · la lectura nueva contradice el snapshot de la pauta`,
          evidence: 'No se genera alerta automática hasta resolver la evidencia.',
          href: '/dashboard/mantenimiento/horometros',
          assetHref: assetHref(row.canonical_asset_id),
        });
      }
    }

    for (const row of closeRows) {
      const number = row.work_order_number || 'OT';
      const href = `/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${row.work_order_id}`;
      const common = { assetHref: assetHref(row.canonical_asset_id) };
      if (Number(row.open_procurement_orders || 0) > 0 || Number(row.pending_parts || 0) > 0 || Number(row.unmet_material_requirements || 0) > 0 || Number(row.pending_external_services || 0) > 0 || Number(row.open_labor_entries || 0) > 0 || Boolean(row.external_cost_conflict)) {
        actions.push({ id:`blocked:${row.work_order_id}`, kind:'operational_blocker', priority:30, title:`Resolver bloqueo operacional · ${number}`, description:row.title || 'Orden de trabajo', evidence:row.next_action || 'Bloqueo operativo', href, ...common });
      } else if (Number(row.standard_plan_steps_pending || 0) > 0) {
        actions.push({ id:`plan:${row.work_order_id}`, kind:'plan_step', priority:40, title:`Ejecutar procedimiento · ${number}`, description:row.next_plan_step_title || row.title || 'Paso pendiente', evidence:`${Number(row.standard_plan_steps_completed || 0)}/${Number(row.standard_plan_steps_total || 0)} pasos realizados`, href, ...common });
      } else if (row.ready_to_close) {
        actions.push({ id:`close:${row.work_order_id}`, kind:'ready_to_close', priority:50, title:`Cerrar OT · ${number}`, description:row.title || 'Orden de trabajo', evidence:'Todos los controles obligatorios están satisfechos.', href, ...common });
      } else {
        const actionLabels: Record<string,string> = {
          resolve_asset: 'Resolver activo canónico',
          record_root_cause: 'Registrar causa raíz',
          record_preventive_actions: 'Registrar acción preventiva',
          record_actual_hours: 'Registrar horas reales',
          record_runtime_evidence: 'Resolver horómetro',
        };
        actions.push({ id:`evidence:${row.work_order_id}`, kind:'closure_evidence', priority:60, title:`${actionLabels[row.next_action] || 'Completar evidencia'} · ${number}`, description:row.title || 'Orden de trabajo', evidence:'Requisito pendiente para cierre auditado.', href, ...common });
      }
    }

    for (const row of reliabilityRows) {
      if (row.has_recurring_root_cause) {
        actions.push({ id:`reliability:${row.canonical_asset_id}`, kind:'reliability', priority:70, title:`Revisar recurrencia · ${row.asset_code || 'Equipo'}`, description:row.asset_name || 'Activo', evidence:`${Number(row.recurring_cause_count || 0)} causa(s) recurrente(s) · máximo ${Number(row.max_same_cause_occurrences || 0)} repeticiones`, href:'/dashboard/mantenimiento/confiabilidad', assetHref:assetHref(row.canonical_asset_id) });
      }
    }

    actions.sort((a,b) => a.priority - b.priority || a.title.localeCompare(b.title, 'es'));

    return NextResponse.json({
      summary: {
        openWorkOrders: closeRows.length,
        historicalOpenWorkOrders: Math.max(0, allCloseRows.length - closeRows.length),
        overdueHourSchedules: preventiveRows.filter((row:any) => row.hour_status === 'overdue').length,
        unplannedOverdueHourSchedules: preventiveRows.filter((row:any) => row.hour_status === 'overdue' && !row.generated_work_order_id).length,
        plannedOverdueHourSchedules: preventiveRows.filter((row:any) => row.hour_status === 'overdue' && Boolean(row.generated_work_order_id)).length,
        pendingOperationalReviews: drillingReviewRows.length,
        outOfServiceOperationalReviews: drillingReviewRows.filter((row:any) => isOutOfServiceReview(row)).length,
        operationallyBlocked: closeRows.filter((row:any) => Number(row.open_procurement_orders || 0) > 0 || Number(row.pending_parts || 0) > 0 || Number(row.unmet_material_requirements || 0) > 0 || Number(row.pending_external_services || 0) > 0 || Number(row.open_labor_entries || 0) > 0 || Boolean(row.external_cost_conflict)).length,
        pendingPlanSteps: closeRows.reduce((sum:number,row:any) => sum + Number(row.standard_plan_steps_pending || 0), 0),
        readyToClose: closeRows.filter((row:any) => row.ready_to_close).length,
        recurringReliabilityAssets: reliabilityRows.filter((row:any) => row.has_recurring_root_cause).length,
        totalActions: actions.length,
      },
      actions: actions.slice(0, 100),
      canEdit: access.canWrite,
      sources: ['work_order_close_readiness_v2','preventive_maintenance_hour_status_v1','maintenance_reliability_by_asset_v1','maintenance_work_orders','drilling_maintenance_review_queue_v1'],
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar el centro de mantenimiento' }, { status: 500 });
  }
}
