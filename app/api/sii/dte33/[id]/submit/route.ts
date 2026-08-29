export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { type StoredSiiCertificate } from '@/lib/sii/client';
import { requestSiiSessionToken, uploadSiiDteEnvelope } from '@/lib/sii/dte-transport';

type RouteContext = { params: Promise<{ id: string }> };

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  const { id } = await context.params;
  if (!validUuid(id)) return NextResponse.json({ error: 'SII_DTE_ID_INVALID' }, { status: 400 });

  const supabase = getSupabaseServerClient(auth.user.id);
  const { data: dte, error: dteError } = await supabase
    .from('sii_outbound_dtes')
    .select('id,environment,status,envelope_xml,track_id')
    .eq('organization_id', auth.organizationId)
    .eq('id', id)
    .maybeSingle();
  if (dteError) {
    console.error('[sii-dte33-submit] DTE read failed', { code: dteError.code });
    return NextResponse.json({ error: 'No se pudo leer el DTE' }, { status: 500 });
  }
  if (!dte) return NextResponse.json({ error: 'SII_DTE_NOT_FOUND' }, { status: 404 });
  if (dte.status === 'accepted' || dte.status === 'rejected') {
    return NextResponse.json({ error: 'SII_DTE_FINAL_STATE' }, { status: 409 });
  }
  if (dte.track_id && ['submitted', 'processing'].includes(dte.status)) {
    return NextResponse.json({ id: dte.id, status: dte.status, trackId: dte.track_id, alreadySubmitted: true });
  }

  const body = await request.json().catch(() => ({}));
  if (dte.environment === 'production' && body?.confirmProduction !== true) {
    return NextResponse.json({ error: 'SII_PRODUCTION_CONFIRMATION_REQUIRED' }, { status: 409 });
  }

  const { data: integration, error: integrationError } = await supabase
    .from('sii_integrations')
    .select('environment,company_rut,signer_rut,certificate_secret_id,certificate_valid_to')
    .eq('organization_id', auth.organizationId)
    .maybeSingle();
  if (integrationError) {
    console.error('[sii-dte33-submit] integration read failed', { code: integrationError.code });
    return NextResponse.json({ error: 'No se pudo leer la configuración SII' }, { status: 500 });
  }
  if (!integration?.company_rut || !integration?.signer_rut || !integration?.certificate_secret_id) {
    return NextResponse.json({ error: 'SII_SUBMISSION_CONFIGURATION_REQUIRED' }, { status: 409 });
  }
  if (integration.environment !== dte.environment) {
    return NextResponse.json({ error: 'SII_DTE_ENVIRONMENT_MISMATCH' }, { status: 409 });
  }
  if (integration.certificate_valid_to && Date.parse(integration.certificate_valid_to) <= Date.now()) {
    return NextResponse.json({ error: 'SII_CERTIFICATE_EXPIRED' }, { status: 409 });
  }

  try {
    const { data: payload, error: payloadError } = await supabase.rpc('get_sii_certificate_payload_v1', {
      p_organization_id: auth.organizationId,
    });
    if (payloadError || typeof payload !== 'string' || !payload) {
      console.error('[sii-dte33-submit] certificate secret read failed', { code: payloadError?.code });
      return NextResponse.json({ error: 'SII_CERTIFICATE_SECRET_UNAVAILABLE' }, { status: 500 });
    }

    const certificate = JSON.parse(payload) as StoredSiiCertificate;
    const environment = dte.environment === 'production' ? 'production' : 'certification';
    const token = await requestSiiSessionToken(environment, certificate);
    const upload = await uploadSiiDteEnvelope({
      environment,
      token,
      signerRut: integration.signer_rut,
      companyRut: integration.company_rut,
      envelopeXml: dte.envelope_xml,
    });

    const { error: recordError } = await supabase.rpc('record_sii_dte_submission_v1', {
      p_organization_id: auth.organizationId,
      p_dte_id: dte.id,
      p_upload_status: upload.status,
      p_track_id: upload.trackId,
      p_response: upload.rawResponse,
    });
    if (recordError) {
      console.error('[sii-dte33-submit] audit save failed', { code: recordError.code });
      return NextResponse.json({ error: 'SII_DTE_UPLOAD_AUDIT_FAILED' }, { status: 500 });
    }

    return NextResponse.json({
      id: dte.id,
      status: upload.status === '0' ? 'submitted' : 'upload_rejected',
      uploadStatus: upload.status,
      trackId: upload.trackId,
      glosa: upload.glosa,
      latencyMs: upload.latencyMs,
    }, { status: upload.status === '0' ? 200 : 422 });
  } catch (error) {
    const code = error instanceof Error && error.message.startsWith('SII_') ? error.message : 'SII_DTE_SUBMISSION_FAILED';
    console.error('[sii-dte33-submit] submission failed', { code: code.split(':')[0] });
    return NextResponse.json({ error: code }, { status: 502 });
  }
}
