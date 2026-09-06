export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type DecisionRow = {
  id: string;
  asset_id: string | null;
  asset_code: string | null;
  asset_name: string | null;
  kind: 'operational_signal' | 'preventive_due' | 'closure' | 'reliability';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  canonical_fact: string;
  professional_interpretation: string;
  hypothesis_to_review: string | null;
  evidence_for: string[];
  evidence_against: string[];
  missing_evidence: string[];
  next_best_action: string;
  href: string;
  human_checkpoint: string;
};

const text = (value: unknown) => String(value ?? '').trim();

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [reviews, preventive, close, reliability] = await Promise.all([
      context.supabase
        .from('drilling_maintenance_review_queue_v1')
        .select('review_id,canonical_asset_id,asset_code,asset_name,operation_date,review_reason,equipment_status_raw,machine_observations,review_status,has_linked_work_order')
        .eq('organization_id', context.organizationId)
        .eq('review_status', 'pending')
        .eq('has_linked_work_order', false)
        .order('operation_date', { ascending: true }),
      context.supabase
        .from('preventive_maintenance_hour_status_v1')
        .select('schedule_id,canonical_asset_id,asset_code,asset_name,task_name,hour_status,remaining_hours,frequency_hours,generated_work_order_id,current_meter,next_due_meter')
        .eq('organization_id', context.organizationId),
      context.supabase
        .from('work_order_close_readiness_v2')
        .select('work_order_id,work_order_number,canonical_asset_id,asset_code,asset_name,title,ready_to_close,next_action,open_procurement_orders,pending_parts,unmet_material_requirements,pending_external_services,open_labor_entries,external_cost_conflict,standard_plan_steps_pending,standard_plan_steps_completed,standard_plan_steps_total')
        .eq('organization_id', context.organizationId),
      context.supabase
        .from('maintenance_reliability_by_asset_v1')
        .select('canonical_asset_id,asset_code,asset_name,audited_closures,recurring_cause_count,max_same_cause_occurrences,has_recurring_root_cause')
        .eq('organization_id', context.organizationId),
    ]);

    const error = reviews.error || preventive.error || close.error || reliability.error;
    if (error) throw error;

    const rows: DecisionRow[] = [];

    for (const row of reviews.data || []) {
      const status = text(row.equipment_status_raw).toLowerCase();
      const out = status.includes('fuera de servicio') || text(row.review_reason).toLowerCase() === 'out_of_service';
      const observation = text(row.machine_observations) || text(row.review_reason) || 'Observación operacional pendiente';
      rows.push({
        id: `review:${row.review_id}`,
        asset_id: row.canonical_asset_id || null,
        asset_code: row.asset_code || null,
        asset_name: row.asset_name || null,
        kind: 'operational_signal',
        urgency: out ? 'critical' : 'high',
        canonical_fact: `${row.equipment_status_raw || 'Señal operacional'}${row.operation_date ? ` · ${row.operation_date}` : ''}`,
        professional_interpretation: out ? 'La evidencia operacional indica indisponibilidad y requiere revisión antes de continuar operación.' : 'Existe una señal de terreno que merece diagnóstico de mantenimiento.',
        hypothesis_to_review: out ? 'La condición reportada podría requerir una intervención correctiva inmediata.' : 'La observación podría corresponder a una falla o degradación que debe confirmarse.',
        evidence_for: [observation],
        evidence_against: [],
        missing_evidence: ['Diagnóstico técnico', 'Causa o modo de falla confirmado', 'Condición segura de operación'],
        next_best_action: 'Revisar la evidencia de terreno y crear una OT correctiva sólo si el responsable confirma la intervención.',
        href: `/dashboard/mantenimiento/ordenes-trabajo/create?reviewId=${encodeURIComponent(String(row.review_id))}&workType=corrective&priority=${out ? 'critical' : 'high'}`,
        human_checkpoint: 'Supervisor/mantenedor valida diagnóstico, prioridad y trabajo antes de crear la OT.',
      });
    }

    for (const row of preventive.data || []) {
      if (row.hour_status !== 'overdue' || row.generated_work_order_id) continue;
      const overdue = Math.abs(Number(row.remaining_hours || 0));
      rows.push({
        id: `preventive:${row.schedule_id}`,
        asset_id: row.canonical_asset_id || null,
        asset_code: row.asset_code || null,
        asset_name: row.asset_name || null,
        kind: 'preventive_due',
        urgency: overdue > Number(row.frequency_hours || 0) * 0.25 ? 'high' : 'medium',
        canonical_fact: `${row.task_name || 'Pauta preventiva'} vencida por ${overdue.toLocaleString('es-CL')} h.`,
        professional_interpretation: 'El activo excedió el umbral de mantenimiento configurado y la pauta aún no tiene OT asociada.',
        hypothesis_to_review: null,
        evidence_for: [`Horómetro actual: ${row.current_meter ?? '—'}`, `Próximo vencimiento: ${row.next_due_meter ?? '—'}`, `Frecuencia: ${row.frequency_hours ?? '—'} h`],
        evidence_against: [],
        missing_evidence: ['Confirmación de disponibilidad del activo', 'Recursos/repuestos requeridos si aplican'],
        next_best_action: 'Planificar la intervención preventiva y generar la OT con ventana y recursos explícitos.',
        href: '/dashboard/mantenimiento/preventivo-horas',
        human_checkpoint: 'Planificador confirma ventana, alcance y recursos antes de comprometer el trabajo.',
      });
    }

    for (const row of close.data || []) {
      if (row.ready_to_close) continue;
      const blockers: string[] = [];
      if (Number(row.open_procurement_orders || 0) > 0) blockers.push('Compras abiertas');
      if (Number(row.pending_parts || 0) > 0) blockers.push('Repuestos pendientes');
      if (Number(row.unmet_material_requirements || 0) > 0) blockers.push('Materiales no cubiertos');
      if (Number(row.pending_external_services || 0) > 0) blockers.push('Servicios externos pendientes');
      if (Number(row.open_labor_entries || 0) > 0) blockers.push('Horas de mano de obra abiertas');
      if (row.external_cost_conflict) blockers.push('Conflicto de costo externo');
      const planPending = Number(row.standard_plan_steps_pending || 0);
      if (!blockers.length && !planPending && !row.next_action) continue;
      rows.push({
        id: `closure:${row.work_order_id}`,
        asset_id: row.canonical_asset_id || null,
        asset_code: row.asset_code || null,
        asset_name: row.asset_name || null,
        kind: 'closure',
        urgency: blockers.length ? 'high' : 'medium',
        canonical_fact: `${row.work_order_number || 'OT'} no está lista para cierre auditado.`,
        professional_interpretation: blockers.length ? 'La OT sigue bloqueada por dependencias operacionales o económicas.' : 'La ejecución requiere completar evidencia/procedimiento antes del cierre.',
        hypothesis_to_review: null,
        evidence_for: blockers.length ? blockers : [`${planPending} paso(s) estándar pendientes`, text(row.next_action)].filter(Boolean),
        evidence_against: [],
        missing_evidence: blockers.length ? blockers : ['Evidencia de cierre requerida por el flujo'],
        next_best_action: blockers[0] ? `Resolver primero: ${blockers[0]}.` : (planPending ? 'Ejecutar el próximo paso del plan estándar.' : 'Completar la próxima evidencia de cierre.'),
        href: `/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${row.work_order_id}`,
        human_checkpoint: 'Responsable de la OT confirma que el requisito se resolvió antes de avanzar al cierre.',
      });
    }

    for (const row of reliability.data || []) {
      if (!row.has_recurring_root_cause) continue;
      rows.push({
        id: `reliability:${row.canonical_asset_id}`,
        asset_id: row.canonical_asset_id || null,
        asset_code: row.asset_code || null,
        asset_name: row.asset_name || null,
        kind: 'reliability',
        urgency: Number(row.max_same_cause_occurrences || 0) >= 3 ? 'high' : 'medium',
        canonical_fact: `${Number(row.recurring_cause_count || 0)} causa(s) raíz recurrente(s) en ${Number(row.audited_closures || 0)} cierres auditados.`,
        professional_interpretation: 'La recurrencia sugiere que al menos una intervención previa podría no haber eliminado el mecanismo que origina la falla.',
        hypothesis_to_review: 'Existe una causa repetitiva que podría requerir cambio de estrategia, estándar o condición operacional.',
        evidence_for: [`Máximo de repeticiones de una misma causa: ${Number(row.max_same_cause_occurrences || 0)}`],
        evidence_against: [],
        missing_evidence: ['Comparación de intervenciones previas', 'Resultado posterior a cada intervención', 'Condición operacional entre fallas'],
        next_best_action: 'Revisar historial de causa/intervención y decidir si corresponde ajustar estrategia o plan estándar.',
        href: '/dashboard/mantenimiento/confiabilidad',
        human_checkpoint: 'Ingeniería de mantenimiento valida la causa recurrente y cualquier cambio de estrategia.',
      });
    }

    const rank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    rows.sort((a, b) => rank[a.urgency] - rank[b.urgency] || a.canonical_fact.localeCompare(b.canonical_fact, 'es'));

    return NextResponse.json({
      summary: {
        total: rows.length,
        critical: rows.filter((row) => row.urgency === 'critical').length,
        high: rows.filter((row) => row.urgency === 'high').length,
        hypotheses: rows.filter((row) => Boolean(row.hypothesis_to_review)).length,
      },
      rows,
      semantics: 'Prioridad operacional explicable; no es probabilidad de falla ni decisión autónoma.',
      sources: ['drilling_maintenance_review_queue_v1', 'preventive_maintenance_hour_status_v1', 'work_order_close_readiness_v2', 'maintenance_reliability_by_asset_v1'],
      canEdit: access.canWrite,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo construir Maintenance Decision Intelligence' }, { status: 500 });
  }
}
