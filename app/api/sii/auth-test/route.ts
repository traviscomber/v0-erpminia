export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import {
  inspectSiiCertificate,
  requestSiiSeed,
  requestSiiToken,
  signSiiSeed,
  type StoredSiiCertificate,
} from '@/lib/sii/client';

function safeAuthError(error: unknown) {
  if (!(error instanceof Error)) return 'SII_AUTHENTICATION_FAILED';
  const message = error.message || 'SII_AUTHENTICATION_FAILED';
  if (message.startsWith('SII_')) return message.slice(0, 500);
  return 'SII_AUTHENTICATION_FAILED';
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  const supabase = getSupabaseServerClient(auth.user.id);
  const { data: config, error: configError } = await supabase
    .from('sii_integrations')
    .select('certificate_secret_id,certificate_valid_to')
    .eq('organization_id', auth.organizationId)
    .maybeSingle();

  if (configError) {
    console.error('[sii-auth-test] config read failed', { code: configError.code });
    return NextResponse.json({ error: 'No se pudo leer la configuración SII' }, { status: 500 });
  }
  if (!config?.certificate_secret_id) {
    return NextResponse.json({ error: 'SII_CERTIFICATE_NOT_CONFIGURED' }, { status: 409 });
  }
  if (config.certificate_valid_to && Date.parse(config.certificate_valid_to) <= Date.now()) {
    return NextResponse.json({ error: 'SII_CERTIFICATE_EXPIRED' }, { status: 409 });
  }

  const startedAt = Date.now();
  try {
    const { data: payload, error: payloadError } = await supabase.rpc('get_sii_certificate_payload_v1', {
      p_organization_id: auth.organizationId,
    });
    if (payloadError || typeof payload !== 'string' || payload.length === 0) {
      console.error('[sii-auth-test] certificate secret read failed', { code: payloadError?.code });
      return NextResponse.json({ error: 'SII_CERTIFICATE_SECRET_UNAVAILABLE' }, { status: 500 });
    }

    const bundle = JSON.parse(payload) as StoredSiiCertificate;
    inspectSiiCertificate(bundle);

    const seedResult = await requestSiiSeed();
    const signedSeedXml = signSiiSeed(seedResult.seed, bundle);
    const tokenResult = await requestSiiToken(signedSeedXml);

    const { error: recordError } = await supabase.rpc('record_sii_auth_test_v1', {
      p_organization_id: auth.organizationId,
      p_ok: true,
      p_error: null,
    });
    if (recordError) console.error('[sii-auth-test] success audit failed', { code: recordError.code });

    return NextResponse.json({
      environment: 'certification',
      siiReachable: true,
      seedReceived: true,
      certificateValid: true,
      authenticated: Boolean(tokenResult.token),
      tokenReceived: Boolean(tokenResult.token),
      latencyMs: Date.now() - startedAt,
      seedLatencyMs: seedResult.latencyMs,
      tokenLatencyMs: tokenResult.latencyMs,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const safeError = safeAuthError(error);
    const { error: recordError } = await supabase.rpc('record_sii_auth_test_v1', {
      p_organization_id: auth.organizationId,
      p_ok: false,
      p_error: safeError,
    });
    if (recordError) console.error('[sii-auth-test] failure audit failed', { code: recordError.code });

    return NextResponse.json(
      {
        environment: 'certification',
        authenticated: false,
        error: safeError,
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
      { status: safeError.includes('CERTIFICATE') || safeError.includes('PRIVATE_KEY') ? 409 : 502 },
    );
  }
}
