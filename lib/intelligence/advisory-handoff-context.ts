const HANDOFF_REVIEW_HINT = /(decision\s*case|caso|handoff|derivad|escalad|prioridad|pendiente|revis|revalid|anterior|eso|ese|esa|qué requiere atención|que requiere atencion)/i;

export type SupportHandoffTarget =
  | 'inventory'
  | 'procurement'
  | 'production'
  | 'finance'
  | 'documents'
  | 'data_health'
  | 'executive'
  | 'maintenance'
  | 'geology';

export type AdvisoryHandoffContext = {
  id: string;
  source_domain: string;
  target_domain: SupportHandoffTarget;
  title: string;
  summary: string;
  created_at: string;
};

export type AdvisoryRevalidationSourceRef =
  | { source: string }
  | { tool: string; mode?: string };

type ScopedContext = {
  organizationId: string;
  userId: string;
  supabase: any;
};

export async function loadSupportAdvisoryHandoffs(
  context: ScopedContext,
  targetDomain: SupportHandoffTarget,
  message: string,
) {
  if (!HANDOFF_REVIEW_HINT.test(message)) return [] as AdvisoryHandoffContext[];

  const { data, error } = await context.supabase
    .from('motil_ai_decision_cases')
    .select('id,source_domain,target_domain,title,summary,created_at')
    .eq('organization_id', context.organizationId)
    .eq('created_by_user_id', context.userId)
    .eq('target_domain', targetDomain)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(3);
  if (error) throw error;
  return (data || []) as AdvisoryHandoffContext[];
}

export async function recordSupportAdvisoryRevalidation(
  context: ScopedContext,
  targetDomain: SupportHandoffTarget,
  handoffs: AdvisoryHandoffContext[],
  evidenceRefs: AdvisoryRevalidationSourceRef[],
) {
  const caseIds = Array.from(new Set(handoffs.map((row) => row.id).filter(Boolean)));
  const refs = evidenceRefs.filter((ref) => {
    if ('source' in ref) return typeof ref.source === 'string' && ref.source.trim().length > 0;
    return typeof ref.tool === 'string' && ref.tool.trim().length > 0;
  });
  if (!caseIds.length || !refs.length) return { updated: 0, at: null as string | null };

  const at = new Date().toISOString();
  const { data, error } = await context.supabase
    .from('motil_ai_decision_cases')
    .update({
      last_revalidated_at: at,
      last_revalidated_by_user_id: context.userId,
      last_revalidation_evidence_refs: refs,
      updated_at: at,
    })
    .eq('organization_id', context.organizationId)
    .eq('created_by_user_id', context.userId)
    .eq('target_domain', targetDomain)
    .eq('status', 'open')
    .in('id', caseIds)
    .select('id');
  if (error) throw error;
  return { updated: (data || []).length, at };
}

export function supportAdvisoryHandoffPrompt(
  handoffs: AdvisoryHandoffContext[],
  domainRule: string,
) {
  if (!handoffs.length) return 'Sin handoffs advisory abiertos aplicables a esta consulta.';
  const rows = handoffs
    .map((row, index) => {
      const summary = String(row.summary || '').replace(/\s+/g, ' ').trim().slice(0, 1800);
      return `${index + 1}. CASE ${row.id} · origen ${row.source_domain} · creado ${row.created_at}\nTítulo: ${row.title}\nResumen previo NO CANÓNICO: ${summary}`;
    })
    .join('\n\n');

  return `HANDOFF ADVISORY NO CANÓNICO — SÓLO DEFINE QUÉ REVALIDAR\n${rows}\n\nREGLA DE REVALIDACIÓN: no uses cifras, estados, causas, prioridades ni conclusiones del handoff como hechos. Vuelve a comprobar todo únicamente contra EVIDENCIA MOTIL actual y autorizada. ${domainRule}`;
}
