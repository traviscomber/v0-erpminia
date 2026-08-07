export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type SourceType = 'work_order' | 'preventive' | 'maintenance_document' | 'automation_run';

const SOURCE_CONFIG: Record<SourceType, { table: string; labelFields: string; href: (id: string, row: any) => string }> = {
  work_order: {
    table: 'maintenance_work_orders',
    labelFields: 'id, work_order_number, title, status',
    href: (id) => `/dashboard/mantenimiento/ordenes-trabajo/${id}`,
  },
  preventive: {
    table: 'preventive_maintenance_schedules',
    labelFields: 'id, task_name, next_scheduled_date, priority, enabled',
    href: () => '/dashboard/mantenimiento/planificacion',
  },
  maintenance_document: {
    table: 'maintenance_expedient_records',
    labelFields: 'id, expedient_key, title, kind, record_date, is_active',
    href: (_id, row) => row?.expedient_key ? `/dashboard/mantenimiento/documentos/expedientes/${encodeURIComponent(row.expedient_key)}` : '/dashboard/mantenimiento/documentos/expedientes',
  },
  automation_run: {
    table: 'automation_rule_runs',
    labelFields: 'id, source_key, category, action_type, created_at',
    href: () => '/dashboard/automatizaciones',
  },
};

function isSourceType(value: unknown): value is SourceType {
  return typeof value === 'string' && value in SOURCE_CONFIG;
}

function labelFor(type: SourceType, row: any) {
  if (!row) return 'Registro no disponible';
  if (type === 'work_order') return `${row.work_order_number || 'OT'} · ${row.title || 'Sin título'}`;
  if (type === 'preventive') return row.task_name || 'Plan preventivo';
  if (type === 'maintenance_document') return row.title || row.expedient_key || 'Registro documental';
  return `${row.category || 'Automatización'} · ${row.action_type || row.source_key || 'Ejecución'}`;
}

async function fetchSource(context: Extract<Awaited<ReturnType<typeof getOrganizationContext>>, { ok: true }>, type: SourceType, id: string) {
  const config = SOURCE_CONFIG[type];
  const { data, error } = await context.supabase
    .from(config.table)
    .select(config.labelFields)
    .eq('organization_id', context.organizationId)
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return { id, type, label: labelFor(type, data), href: config.href(id, data), row: data };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [findingsResult, peopleResult, workOrdersResult, preventiveResult, documentsResult, automationRunsResult] = await Promise.all([
    context.supabase
      .from('operational_audit_findings')
      .select('id, source_type, source_id, criterion, finding, severity, responsible_person_id, status, reviewed_by, reviewed_at, resolution_note, evidence_reference, resolved_by, resolved_at')
      .eq('organization_id', context.organizationId)
      .order('reviewed_at', { ascending: false })
      .limit(300),
    context.supabase.from('people').select('id, full_name, role_title, email').eq('organization_id', context.organizationId).order('full_name').limit(1000),
    context.supabase.from('maintenance_work_orders').select('id, work_order_number, title, status').eq('organization_id', context.organizationId).order('updated_at', { ascending: false }).limit(200),
    context.supabase.from('preventive_maintenance_schedules').select('id, task_name, next_scheduled_date, priority, enabled').eq('organization_id', context.organizationId).order('updated_at', { ascending: false }).limit(200),
    context.supabase.from('maintenance_expedient_records').select('id, expedient_key, title, kind, record_date, is_active').eq('organization_id', context.organizationId).order('updated_at', { ascending: false }).limit(200),
    context.supabase.from('automation_rule_runs').select('id, source_key, category, action_type, created_at').eq('organization_id', context.organizationId).order('created_at', { ascending: false }).limit(200),
  ]);

  if (findingsResult.error || peopleResult.error || workOrdersResult.error || preventiveResult.error || documentsResult.error || automationRunsResult.error) {
    return NextResponse.json({ error: 'No se pudo cargar la auditoría operacional.' }, { status: 500 });
  }

  const sourceRows: Record<SourceType, any[]> = {
    work_order: workOrdersResult.data || [],
    preventive: preventiveResult.data || [],
    maintenance_document: documentsResult.data || [],
    automation_run: automationRunsResult.data || [],
  };
  const sourceMap = new Map<string, { label: string; href: string }>();
  for (const type of Object.keys(sourceRows) as SourceType[]) {
    for (const row of sourceRows[type]) {
      sourceMap.set(`${type}:${row.id}`, { label: labelFor(type, row), href: SOURCE_CONFIG[type].href(String(row.id), row) });
    }
  }

  const findings = (findingsResult.data || []).map((finding: any) => ({
    ...finding,
    source: sourceMap.get(`${finding.source_type}:${finding.source_id}`) || null,
  }));

  return NextResponse.json({
    findings,
    people: peopleResult.data || [],
    sources: sourceRows,
    source: 'canonical',
  });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const sourceType = body?.sourceType;
  const sourceId = typeof body?.sourceId === 'string' ? body.sourceId : '';
  const criterion = typeof body?.criterion === 'string' ? body.criterion.trim() : '';
  const finding = typeof body?.finding === 'string' ? body.finding.trim() : '';
  const severity = ['observation', 'minor', 'major', 'critical'].includes(body?.severity) ? body.severity : 'observation';
  const responsiblePersonId = typeof body?.responsiblePersonId === 'string' && body.responsiblePersonId ? body.responsiblePersonId : null;

  if (!isSourceType(sourceType) || !sourceId || !criterion || !finding) {
    return NextResponse.json({ error: 'Selecciona una fuente y registra criterio y hallazgo.' }, { status: 400 });
  }

  const source = await fetchSource(context, sourceType, sourceId);
  if (!source) return NextResponse.json({ error: 'La fuente no existe en la organización activa.' }, { status: 400 });

  if (responsiblePersonId) {
    const { data: person } = await context.supabase.from('people').select('id').eq('organization_id', context.organizationId).eq('id', responsiblePersonId).maybeSingle();
    if (!person) return NextResponse.json({ error: 'La persona responsable no pertenece a la organización.' }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from('operational_audit_findings')
    .insert({
      organization_id: context.organizationId,
      source_type: sourceType,
      source_id: sourceId,
      criterion,
      finding,
      severity,
      responsible_person_id: responsiblePersonId,
      status: 'open',
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    })
    .select('id, status, reviewed_at')
    .single();

  if (error) return NextResponse.json({ error: 'No se pudo registrar el hallazgo.' }, { status: 500 });
  return NextResponse.json({ finding: data, source }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const resolutionNote = typeof body?.resolutionNote === 'string' ? body.resolutionNote.trim() : '';
  const evidenceReference = typeof body?.evidenceReference === 'string' && body.evidenceReference.trim() ? body.evidenceReference.trim() : null;
  if (!id || !resolutionNote) return NextResponse.json({ error: 'Describe cómo se resolvió el hallazgo.' }, { status: 400 });

  const { data: finding } = await context.supabase
    .from('operational_audit_findings')
    .select('id, status, source_type, source_id')
    .eq('organization_id', context.organizationId)
    .eq('id', id)
    .maybeSingle();
  if (!finding) return NextResponse.json({ error: 'Hallazgo no encontrado.' }, { status: 404 });
  if (finding.status === 'resolved') return NextResponse.json({ ok: true, status: 'resolved' });

  const now = new Date().toISOString();
  const { error } = await context.supabase
    .from('operational_audit_findings')
    .update({ status: 'resolved', resolution_note: resolutionNote, evidence_reference: evidenceReference, resolved_by: context.userId, resolved_at: now, updated_at: now })
    .eq('organization_id', context.organizationId)
    .eq('id', id);
  if (error) return NextResponse.json({ error: 'No se pudo cerrar el hallazgo.' }, { status: 500 });

  return NextResponse.json({ ok: true, status: 'resolved', resolvedAt: now });
}
