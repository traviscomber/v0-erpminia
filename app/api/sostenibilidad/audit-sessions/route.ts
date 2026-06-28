export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeComplianceStatus(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['compliant', 'conforme', 'cumple'].includes(text)) return 'compliant';
  if (['non_compliant', 'no_conforme', 'no cumple'].includes(text)) return 'non_compliant';
  return 'in_progress';
}

async function selectAuditSessions(supabase: any, organizationId: string, limit: number) {
  const candidateColumns = ['organization_id', 'org_id'] as const;

  for (const column of candidateColumns) {
    const { data, error } = await supabase
      .from('compliance_audit_log')
      .select('*')
      .eq(column, organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error) {
      return { data, error: null };
    }

    const message = String(error.message || '').toLowerCase();
    const looksLikeMissingColumn =
      message.includes(column) && (message.includes('column') || message.includes('does not exist'));

    if (!looksLikeMissingColumn) {
      return { data: null, error };
    }
  }

  return supabase
    .from('compliance_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
}

async function insertAuditSession(
  supabase: any,
  organizationId: string,
  payload: Record<string, unknown>
) {
  const candidateColumns = ['organization_id', 'org_id'] as const;

  for (const column of candidateColumns) {
    const { data, error } = await supabase
      .from('compliance_audit_log')
      .insert({
        [column]: organizationId,
        ...payload,
      })
      .select('*')
      .single();

    if (!error) {
      return { data, error: null };
    }

    const message = String(error.message || '').toLowerCase();
    const looksLikeMissingColumn =
      message.includes(column) && (message.includes('column') || message.includes('does not exist'));

    if (!looksLikeMissingColumn) {
      return { data: null, error };
    }
  }

  return supabase
    .from('compliance_audit_log')
    .insert(payload)
    .select('*')
    .single();
}

export async function GET(request: NextRequest) {
  try {
    const context = await getSustainabilityContext(request);
    if (!context.ok) return context.response;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const { data, error } = await selectAuditSessions(context.supabase, context.organizationId, limit);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las auditorias';
    console.error('[sostenibilidad][audit-sessions] GET fallback:', message);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getSustainabilityContext(request);
    if (!context.ok) return context.response;
    const body = await request.json();
    const auditName =
      normalizeText(body.audit_name || body.name || body.auditName) || 'Auditoria sin nombre';
    const category = normalizeText(body.category || body.auditCategory) || 'ISO';
    const auditor =
      normalizeText(body.auditor || body.responsible || body.auditor_name || context.userName) ||
      'Por asignar';
    const evidenceCount = Number(body.evidence_count ?? body.evidenceCount ?? 0);
    const complianceStatus = normalizeComplianceStatus(body.compliance_status || body.status);

    const { data, error } = await insertAuditSession(context.supabase, context.organizationId, {
      audit_name: auditName,
      category,
      compliance_status: complianceStatus,
      auditor,
      evidence_count: Number.isFinite(evidenceCount) ? evidenceCount : 0,
    });

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo registrar la auditoria';
    console.error('[sostenibilidad][audit-sessions] POST fallback:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
