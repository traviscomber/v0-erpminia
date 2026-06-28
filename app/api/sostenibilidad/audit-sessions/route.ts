export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function normalizeComplianceStatus(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  if (['compliant', 'conforme', 'cumple'].includes(text)) return 'compliant';
  if (['non_compliant', 'no_conforme', 'no cumple'].includes(text)) return 'non_compliant';
  return 'in_progress';
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const { data, error } = await supabase
      .from('compliance_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

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
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const auditName = String(body.audit_name || body.name || 'Auditoria sin nombre').trim();
    const category = String(body.category || 'ISO').trim();
    const auditor = String(body.auditor || body.responsible || 'Por asignar').trim();
    const evidenceCount = Number(body.evidence_count ?? body.evidenceCount ?? 0);
    const complianceStatus = normalizeComplianceStatus(body.compliance_status || body.status);

    const { data, error } = await supabase
      .from('compliance_audit_log')
      .insert({
        audit_name: auditName,
        category,
        compliance_status: complianceStatus,
        auditor,
        evidence_count: Number.isFinite(evidenceCount) ? evidenceCount : 0,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo registrar la auditoria';
    console.error('[sostenibilidad][audit-sessions] POST fallback:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
