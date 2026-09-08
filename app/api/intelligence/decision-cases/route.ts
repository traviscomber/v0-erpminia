export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import {
  canAccessDecisionCaseDomain,
  filterAccessibleDecisionCaseDomains,
  isDecisionCaseDomain,
  type DecisionCaseDomain,
} from '@/lib/intelligence/decision-case-access';

const MAX_TEXT = 12000;
const MAX_LIST = 12;

const WORKFLOW_DOMAIN: Partial<Record<DecisionCaseDomain, string>> = {
  production: 'plant',
  inventory: 'inventory',
  finance: 'finance',
  maintenance: 'maintenance',
};

function cleanText(value: unknown, max = MAX_TEXT) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim().slice(0, 1000))
    .filter(Boolean)
    .slice(0, MAX_LIST);
}

function titleFromSummary(summary: string) {
  const normalized = summary.replace(/\s+/g, ' ').trim();
  return normalized.length > 96 ? `${normalized.slice(0, 93)}…` : normalized || 'Caso de decisión MOTIL';
}

async function availableHumanWorkflows(
  db: any,
  organizationId: string,
  userId: string,
  targetDomain: DecisionCaseDomain,
) {
  const workflowDomain = WORKFLOW_DOMAIN[targetDomain];
  if (!workflowDomain) return [];

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('cargo_id')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.cargo_id) return [];

  const { data, error } = await db
    .from('role_tasks_actionable_v1')
    .select('task_key,domain,severity,effective_priority,title,evidence_summary,recommended_action,responsibility,role_action,urgency_state,due_at,escalation_at')
    .eq('organization_id', organizationId)
    .eq('cargo_id', profile.cargo_id)
    .eq('domain', workflowDomain)
    .order('effective_priority', { ascending: false })
    .limit(12);
  if (error) throw error;
  return data || [];
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const requestedStatus = request.nextUrl.searchParams.get('status');
  const status = ['open', 'acknowledged', 'archived'].includes(String(requestedStatus))
    ? String(requestedStatus)
    : 'open';

  const { data, error } = await context.supabase
    .from('motil_ai_decision_cases')
    .select('id,source_domain,target_domain,source_conversation_id,source_message_id,title,summary,evidence_refs,uncertainty,contradictions,missing_evidence,recommended_human_action,recommended_workflow_key,authority,status,acknowledged_at,created_at,updated_at')
    .eq('organization_id', context.organizationId)
    .eq('created_by_user_id', context.userId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const domains = rows.flatMap((row: any) => [row.source_domain, row.target_domain]).filter(isDecisionCaseDomain);
  const accessible = await filterAccessibleDecisionCaseDomains(request, domains);
  const visible = rows.filter((row: any) => accessible.has(row.source_domain) && accessible.has(row.target_domain));

  return NextResponse.json({
    cases: visible,
    hiddenByCurrentPermissions: rows.length - visible.length,
    authority: 'advisory_only',
    policy: 'Decision Cases no sustituyen datos canónicos ni autorizan acciones operacionales.',
  });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const action = cleanText(body?.action, 32) || 'create';

  if (action === 'acknowledge' || action === 'archive') {
    const caseId = cleanText(body?.caseId, 80);
    if (!caseId) return NextResponse.json({ error: 'caseId es requerido.' }, { status: 400 });
    const nextStatus = action === 'acknowledge' ? 'acknowledged' : 'archived';
    const patch = action === 'acknowledge'
      ? { status: nextStatus, acknowledged_by_user_id: context.userId, acknowledged_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : { status: nextStatus, updated_at: new Date().toISOString() };
    const { data, error } = await context.supabase
      .from('motil_ai_decision_cases')
      .update(patch)
      .eq('id', caseId)
      .eq('organization_id', context.organizationId)
      .eq('created_by_user_id', context.userId)
      .select('id,status,acknowledged_at,updated_at')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Caso no encontrado.' }, { status: 404 });
    return NextResponse.json({ case: data, authority: 'advisory_only' });
  }

  if (action !== 'create') return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });

  const sourceConversationId = cleanText(body?.sourceConversationId, 80);
  const sourceMessageId = cleanText(body?.sourceMessageId, 80);
  const targetDomain = body?.targetDomain;
  if (!sourceConversationId || !sourceMessageId || !isDecisionCaseDomain(targetDomain)) {
    return NextResponse.json({ error: 'sourceConversationId, sourceMessageId y targetDomain válidos son requeridos.' }, { status: 400 });
  }

  const { data: message, error: messageError } = await context.supabase
    .from('motil_ai_messages')
    .select('id,conversation_id,domain,role,content,source_refs,model,created_at')
    .eq('id', sourceMessageId)
    .eq('conversation_id', sourceConversationId)
    .eq('organization_id', context.organizationId)
    .eq('user_id', context.userId)
    .eq('role', 'assistant')
    .maybeSingle();
  if (messageError) return NextResponse.json({ error: messageError.message }, { status: 500 });
  if (!message || !isDecisionCaseDomain(message.domain)) {
    return NextResponse.json({ error: 'El mensaje fuente no pertenece a una conversación MOTIL accesible.' }, { status: 404 });
  }

  const evidenceRefs = Array.isArray(message.source_refs) ? message.source_refs : [];
  if (!evidenceRefs.length) {
    return NextResponse.json({ error: 'El mensaje fuente no contiene evidencia persistida; no puede convertirse en Decision Case.' }, { status: 409 });
  }

  const [sourceAllowed, targetAllowed] = await Promise.all([
    canAccessDecisionCaseDomain(request, message.domain),
    canAccessDecisionCaseDomain(request, targetDomain),
  ]);
  if (!sourceAllowed || !targetAllowed) {
    return NextResponse.json({ error: 'No tienes permisos actuales para el origen o destino del handoff.' }, { status: 403 });
  }

  const workflows = await availableHumanWorkflows(
    context.supabase,
    context.organizationId,
    context.userId,
    targetDomain,
  );
  const requestedWorkflowKey = cleanText(body?.recommendedWorkflowKey, 240);
  const workflow = requestedWorkflowKey
    ? workflows.find((row: any) => row.task_key === requestedWorkflowKey)
    : null;
  if (requestedWorkflowKey && !workflow) {
    return NextResponse.json({ error: 'El workflow sugerido no está disponible actualmente para tu cargo y dominio destino.' }, { status: 409 });
  }

  const summary = cleanText(message.content);
  const title = cleanText(body?.title, 180) || titleFromSummary(summary);
  const uncertainty = cleanText(body?.uncertainty, 3000) || null;
  const recommendedHumanAction = cleanText(body?.recommendedHumanAction, 3000) || null;

  const { data: created, error: createError } = await context.supabase
    .from('motil_ai_decision_cases')
    .insert({
      organization_id: context.organizationId,
      created_by_user_id: context.userId,
      source_domain: message.domain,
      target_domain: targetDomain,
      source_conversation_id: sourceConversationId,
      source_message_id: sourceMessageId,
      title,
      summary,
      evidence_refs: evidenceRefs,
      uncertainty,
      contradictions: cleanList(body?.contradictions),
      missing_evidence: cleanList(body?.missingEvidence),
      recommended_human_action: recommendedHumanAction,
      recommended_workflow_key: workflow?.task_key || null,
      authority: 'advisory_only',
      status: 'open',
    })
    .select('id,source_domain,target_domain,title,summary,evidence_refs,uncertainty,contradictions,missing_evidence,recommended_human_action,recommended_workflow_key,authority,status,created_at')
    .single();
  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });

  return NextResponse.json({
    case: created,
    availableHumanWorkflows: workflows,
    handoff: {
      sourceDomain: message.domain,
      targetDomain,
      targetPermissionVerified: true,
      operationalMutationExecuted: false,
    },
    policy: 'Caso advisory no canónico. La evidencia proviene del mensaje fuente; cualquier workflow sigue requiriendo acción humana en su módulo.',
  }, { status: 201 });
}
