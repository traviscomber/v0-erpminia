export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function publicRun(row: any) {
  return {
    id: row.id,
    scenario: row.scenario,
    companyRut: row.company_rut,
    receiverRut: row.receiver_rut,
    documentType: Number(row.document_type),
    folio: Number(row.folio),
    netAmount: Number(row.net_amount),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    trackId: row.track_id,
    status: row.status,
    statusCode: row.status_code,
    statusMessage: row.status_message,
    payloadHash: row.payload_hash,
    steps: Array.isArray(row.steps) ? row.steps : [],
    createdAt: row.created_at,
    simulated: true,
    siiNetworkCalled: false,
  };
}

const selectColumns = [
  'id',
  'scenario',
  'company_rut',
  'receiver_rut',
  'document_type',
  'folio',
  'net_amount',
  'tax_amount',
  'total_amount',
  'track_id',
  'status',
  'status_code',
  'status_message',
  'payload_hash',
  'steps',
  'created_at',
].join(',');

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  const supabase = getSupabaseServerClient(auth.user.id);
  const { data, error } = await supabase
    .from('sii_demo_runs')
    .select(selectColumns)
    .eq('organization_id', auth.organizationId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[sii-demo] list failed', { code: error.code });
    return NextResponse.json({ error: 'SII_DEMO_LIST_FAILED' }, { status: 500 });
  }

  return NextResponse.json({
    demo: true,
    isolation: 'sii_demo_runs',
    siiNetworkCalled: false,
    runs: (data || []).map(publicRun),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  const body = await request.json().catch(() => ({}));
  const scenario = body?.scenario === 'rejected' ? 'rejected' : body?.scenario === 'accepted' ? 'accepted' : null;
  if (!scenario) return NextResponse.json({ error: 'SII_DEMO_SCENARIO_INVALID' }, { status: 400 });

  const supabase = getSupabaseServerClient(auth.user.id);
  const { data: runId, error: createError } = await supabase.rpc('create_sii_demo_run_v1', {
    p_organization_id: auth.organizationId,
    p_actor_id: auth.user.id,
    p_scenario: scenario,
  });

  if (createError || !runId) {
    console.error('[sii-demo] create failed', { code: createError?.code });
    return NextResponse.json({ error: 'SII_DEMO_CREATE_FAILED' }, { status: 500 });
  }

  const { data: run, error: readError } = await supabase
    .from('sii_demo_runs')
    .select(selectColumns)
    .eq('organization_id', auth.organizationId)
    .eq('id', runId)
    .single();

  if (readError || !run) {
    console.error('[sii-demo] read-after-create failed', { code: readError?.code });
    return NextResponse.json({ error: 'SII_DEMO_READ_FAILED' }, { status: 500 });
  }

  return NextResponse.json(publicRun(run), { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  const supabase = getSupabaseServerClient(auth.user.id);
  const { data: deleted, error } = await supabase.rpc('clear_sii_demo_runs_v1', {
    p_organization_id: auth.organizationId,
    p_actor_id: auth.user.id,
  });

  if (error) {
    console.error('[sii-demo] clear failed', { code: error.code });
    return NextResponse.json({ error: 'SII_DEMO_CLEAR_FAILED' }, { status: 500 });
  }

  return NextResponse.json({ demo: true, deleted: Number(deleted || 0), siiNetworkCalled: false });
}
