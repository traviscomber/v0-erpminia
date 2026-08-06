export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type KanbanColumn = 'backlog' | 'ready' | 'in_progress' | 'waiting_material' | 'waiting_approval' | 'validation' | 'completed';
type SourceType = 'maintenance' | 'compliance' | 'procurement';

type KanbanCard = {
  id: string;
  source: SourceType;
  sourceLabel: string;
  sourceId: string;
  reference: string;
  title: string;
  subtitle: string | null;
  owner: string | null;
  priority: string;
  column: KanbanColumn;
  updatedAt: string;
  ageHours: number;
  dueDate: string | null;
  href: string;
  movable: boolean;
};

const WIP_LIMITS: Record<KanbanColumn, number | null> = {
  backlog: null,
  ready: 12,
  in_progress: 10,
  waiting_material: 8,
  waiting_approval: 8,
  validation: 6,
  completed: null,
};

function hoursSince(value: string | null | undefined) {
  const timestamp = value ? new Date(value).getTime() : Date.now();
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000));
}

function normalizePriority(value: unknown) {
  const priority = String(value || '').toLowerCase();
  if (priority.includes('crit')) return 'critical';
  if (priority.includes('high') || priority.includes('alta')) return 'high';
  if (priority.includes('low') || priority.includes('baja')) return 'low';
  return 'medium';
}

function maintenanceColumn(status: string | null | undefined, waitingMaterial: boolean): KanbanColumn {
  if (waitingMaterial) return 'waiting_material';
  const normalized = String(status || '').toLowerCase();
  if (['completed', 'closed', 'completada', 'cerrada'].includes(normalized)) return 'completed';
  if (['in_progress', 'en_progreso', 'working'].includes(normalized)) return 'in_progress';
  if (['scheduled', 'planned', 'ready', 'programada'].includes(normalized)) return 'ready';
  if (['validation', 'review', 'pending_validation'].includes(normalized)) return 'validation';
  return 'backlog';
}

function complianceColumn(status: string | null | undefined): KanbanColumn {
  const normalized = String(status || '').toLowerCase();
  if (['completed', 'cancelled', 'cerrada'].includes(normalized)) return 'completed';
  if (['in_progress', 'en_progreso'].includes(normalized)) return 'in_progress';
  return 'ready';
}

function procurementColumn(status: string | null | undefined): KanbanColumn {
  const normalized = String(status || '').toLowerCase();
  if (['received', 'closed', 'completed'].includes(normalized)) return 'completed';
  if (['issued', 'ordered', 'partially_received'].includes(normalized)) return 'waiting_material';
  if (['pending_approval', 'approval', 'submitted'].includes(normalized)) return 'waiting_approval';
  if (['draft', 'pending'].includes(normalized)) return 'backlog';
  return 'ready';
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [{ data: workOrders, error: woError }, { data: materialNeeds, error: materialError }, { data: compliance, error: complianceError }, { data: procurement, error: procurementError }] = await Promise.all([
      context.supabase
        .from('maintenance_work_orders')
        .select('id, work_order_number, title, description, status, priority, scheduled_date, assigned_to_name, created_at, updated_at, asset:maintenance_assets(asset_name)')
        .eq('organization_id', context.organizationId)
        .not('status', 'in', '(cancelled,canceled)')
        .order('updated_at', { ascending: false })
        .limit(160),
      context.supabase
        .from('work_order_material_requirements')
        .select('work_order_id, status, quantity_shortage')
        .eq('organization_id', context.organizationId)
        .in('status', ['pending', 'procurement_needed', 'ordered']),
      context.supabase
        .from('compliance_events')
        .select('id, title, description, status, priority, due_date, responsible_person_name, created_at, updated_at')
        .eq('org_id', context.organizationId)
        .order('updated_at', { ascending: false })
        .limit(120),
      context.supabase
        .from('procurement_intake_requests')
        .select('id, request_number, justification, status, priority, required_date, requested_by_name, created_at, updated_at')
        .eq('organization_id', context.organizationId)
        .order('updated_at', { ascending: false })
        .limit(120),
    ]);

    if (woError) throw woError;
    if (materialError) throw materialError;

    const waitingMaterial = new Set(
      (materialNeeds || [])
        .filter((item) => Number(item.quantity_shortage || 0) > 0 || item.status !== 'covered')
        .map((item) => item.work_order_id),
    );

    const cards: KanbanCard[] = (workOrders || []).map((row) => {
      const asset = Array.isArray(row.asset) ? row.asset[0] : row.asset;
      return {
        id: `maintenance:${row.id}`,
        source: 'maintenance',
        sourceLabel: 'Mantenimiento',
        sourceId: row.id,
        reference: row.work_order_number || 'OT sin número',
        title: row.title,
        subtitle: asset?.asset_name || row.description || null,
        owner: row.assigned_to_name || null,
        priority: normalizePriority(row.priority),
        column: maintenanceColumn(row.status, waitingMaterial.has(row.id)),
        updatedAt: row.updated_at || row.created_at,
        ageHours: hoursSince(row.updated_at || row.created_at),
        dueDate: row.scheduled_date || null,
        href: `/dashboard/mantenimiento/ordenes-trabajo/${row.id}`,
        movable: true,
      };
    });

    if (!complianceError) {
      for (const row of compliance || []) {
        cards.push({
          id: `compliance:${row.id}`,
          source: 'compliance',
          sourceLabel: 'HSE',
          sourceId: row.id,
          reference: 'Compromiso',
          title: row.title,
          subtitle: row.description || null,
          owner: row.responsible_person_name || null,
          priority: normalizePriority(row.priority),
          column: complianceColumn(row.status),
          updatedAt: row.updated_at || row.created_at,
          ageHours: hoursSince(row.updated_at || row.created_at),
          dueDate: row.due_date || null,
          href: '/dashboard/sostenibilidad/calendario',
          movable: true,
        });
      }
    }

    if (!procurementError) {
      for (const row of procurement || []) {
        cards.push({
          id: `procurement:${row.id}`,
          source: 'procurement',
          sourceLabel: 'Abastecimiento',
          sourceId: row.id,
          reference: row.request_number || 'Solicitud',
          title: row.justification || row.request_number || 'Solicitud de abastecimiento',
          subtitle: null,
          owner: row.requested_by_name || null,
          priority: normalizePriority(row.priority),
          column: procurementColumn(row.status),
          updatedAt: row.updated_at || row.created_at,
          ageHours: hoursSince(row.updated_at || row.created_at),
          dueDate: row.required_date || null,
          href: '/dashboard/compras',
          movable: false,
        });
      }
    }

    const counts = cards.reduce<Record<KanbanColumn, number>>((acc, card) => {
      acc[card.column] += 1;
      return acc;
    }, { backlog: 0, ready: 0, in_progress: 0, waiting_material: 0, waiting_approval: 0, validation: 0, completed: 0 });

    return NextResponse.json({
      data: cards,
      columns: WIP_LIMITS,
      counts,
      summary: {
        total: cards.length,
        active: cards.filter((card) => card.column !== 'completed').length,
        blocked: cards.filter((card) => ['waiting_material', 'waiting_approval'].includes(card.column)).length,
        overdue: cards.filter((card) => card.dueDate && new Date(card.dueDate).getTime() < Date.now() && card.column !== 'completed').length,
      },
      warnings: [complianceError ? 'No se pudo cargar cumplimiento.' : null, procurementError ? 'No se pudo cargar abastecimiento.' : null].filter(Boolean),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el Kanban';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function maintenanceStatus(column: KanbanColumn) {
  if (column === 'in_progress') return 'in_progress';
  if (column === 'completed') return 'completed';
  if (column === 'validation') return 'pending_validation';
  if (column === 'ready') return 'scheduled';
  return 'open';
}

function complianceStatus(column: KanbanColumn) {
  if (column === 'in_progress') return 'in_progress';
  if (column === 'completed') return 'completed';
  return 'pending';
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const source = body.source as SourceType;
    const sourceId = String(body.sourceId || '');
    const column = body.column as KanbanColumn;
    const allowedColumns: KanbanColumn[] = ['backlog', 'ready', 'in_progress', 'validation', 'completed'];

    if (!sourceId || !allowedColumns.includes(column)) {
      return NextResponse.json({ error: 'Movimiento Kanban inválido' }, { status: 400 });
    }

    if (source === 'maintenance') {
      const { data: current, error: currentError } = await context.supabase
        .from('maintenance_work_orders')
        .select('status, canonical_asset_id, start_date')
        .eq('id', sourceId)
        .eq('organization_id', context.organizationId)
        .single();
      if (currentError) throw currentError;

      const newStatus = maintenanceStatus(column);
      const now = new Date().toISOString();
      const payload: Record<string, unknown> = { status: newStatus, updated_at: now };
      if (column === 'in_progress' && !current.start_date) payload.start_date = now;
      if (column === 'completed') {
        payload.completion_date = now;
        payload.closed_at = now;
        payload.closed_by = context.userId;
      }

      const { error } = await context.supabase
        .from('maintenance_work_orders')
        .update(payload)
        .eq('id', sourceId)
        .eq('organization_id', context.organizationId);
      if (error) throw error;

      await context.supabase.from('work_order_events').insert({
        organization_id: context.organizationId,
        work_order_id: sourceId,
        canonical_asset_id: current.canonical_asset_id,
        event_type: 'kanban_status_changed',
        actor_id: context.userId,
        actor_name: context.userName,
        source_table: 'maintenance_work_orders',
        source_record_id: sourceId,
        summary: `Kanban: ${current.status || 'sin estado'} → ${newStatus}`,
        payload: { previous_status: current.status, new_status: newStatus, column },
      });

      return NextResponse.json({ success: true });
    }

    if (source === 'compliance') {
      const { error } = await context.supabase
        .from('compliance_events')
        .update({ status: complianceStatus(column), updated_at: new Date().toISOString() })
        .eq('id', sourceId)
        .eq('org_id', context.organizationId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Esta fuente es de solo lectura en Kanban' }, { status: 409 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo mover la tarjeta';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
