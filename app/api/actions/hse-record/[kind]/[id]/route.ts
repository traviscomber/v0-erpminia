export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HSE_KINDS = new Set(['incident', 'risk']);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { kind, id } = await params;
  if (!HSE_KINDS.has(kind) || !UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Registro HSE inválido' }, { status: 400 });
  }

  const { data: profile, error: profileError } = await context.supabase
    .from('profiles')
    .select('cargo_id')
    .eq('id', context.userId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (profileError) {
    console.error('[actions/hse-record] profile lookup failed', profileError);
    return NextResponse.json({ error: 'No se pudo resolver tu cargo' }, { status: 500 });
  }
  if (!profile?.cargo_id) return NextResponse.json({ error: 'Cargo no disponible' }, { status: 403 });

  const taskKey = `${kind}:${id}`;
  const { data: task, error: taskError } = await context.supabase
    .from('role_task_frontend_v1')
    .select('task_key,title,evidence_summary,status,severity,responsibility,role_action,due_at,urgency_label,responsibility_label,visible_now')
    .eq('organization_id', context.organizationId)
    .eq('cargo_id', profile.cargo_id)
    .eq('task_key', taskKey)
    .eq('visible_now', true)
    .order('priority_score', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (taskError) {
    console.error('[actions/hse-record] task authorization failed', taskError);
    return NextResponse.json({ error: 'No se pudo autorizar la acción HSE' }, { status: 500 });
  }
  if (!task) return NextResponse.json({ error: 'Esta acción HSE no está disponible para tu cargo' }, { status: 404 });

  const query = kind === 'incident'
    ? context.supabase
        .from('incidents')
        .select('id,incident_number,date_occurred,date_reported,location,incident_type,severity,description,people_involved,injuries_count,reported_by,assigned_to,status,investigation_status,root_cause_identified,created_at,updated_at')
        .eq('id', id)
        .maybeSingle()
    : context.supabase
        .from('risk_matrix')
        .select('id,hazard_id,hazard_description,process_or_area,likelihood,severity,risk_level,current_controls,control_effectiveness,residual_risk_level,risk_owner,mitigation_plan,last_review_date,next_review_date,status,created_at,updated_at')
        .eq('id', id)
        .maybeSingle();

  const { data: record, error: recordError } = await query;
  if (recordError) {
    console.error('[actions/hse-record] legacy source lookup failed', recordError);
    return NextResponse.json({ error: 'No se pudo cargar la evidencia HSE' }, { status: 500 });
  }
  if (!record) return NextResponse.json({ error: 'Registro HSE no encontrado' }, { status: 404 });

  return NextResponse.json({
    kind,
    task,
    record,
    source: kind === 'incident' ? 'incidents' : 'risk_matrix',
    authorizationBoundary: 'role_task_frontend_v1',
  });
}
