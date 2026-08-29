export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { parseAndValidateSiiCaf } from '@/lib/sii/caf';

const MAX_CAF_BYTES = 1024 * 1024;

function publicCaf(row: any) {
  const remaining = Math.max(0, Number(row.range_end) - Number(row.next_folio) + 1);
  return {
    id: row.id,
    environment: row.environment,
    companyRut: row.company_rut,
    documentType: Number(row.document_type),
    rangeStart: Number(row.range_start),
    rangeEnd: Number(row.range_end),
    nextFolio: Number(row.next_folio),
    availableFolios: remaining,
    authorizationDate: row.authorization_date,
    cafVersion: row.caf_version,
    keyId: row.key_id == null ? null : Number(row.key_id),
    signatureAlgorithm: row.signature_algorithm || null,
    fingerprintSha256: row.fingerprint_sha256,
    status: row.status,
    uploadedAt: row.uploaded_at,
    exhaustedAt: row.exhausted_at || null,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  const supabase = getSupabaseServerClient(auth.user.id);
  const { data, error } = await supabase
    .from('sii_cafs')
    .select('id,environment,company_rut,document_type,range_start,range_end,next_folio,authorization_date,caf_version,key_id,signature_algorithm,fingerprint_sha256,status,uploaded_at,exhausted_at')
    .eq('organization_id', auth.organizationId)
    .order('document_type', { ascending: true })
    .order('range_start', { ascending: true });

  if (error) {
    console.error('[sii-cafs] read failed', { code: error.code });
    return NextResponse.json({ error: 'No se pudo leer el inventario de CAF' }, { status: 500 });
  }

  return NextResponse.json({ cafs: (data || []).map(publicCaf) });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  try {
    const form = await request.formData();
    const cafFile = form.get('caf');
    if (!(cafFile instanceof File)) {
      return NextResponse.json({ error: 'Selecciona el archivo XML de autorización de folios del SII' }, { status: 400 });
    }
    if (cafFile.size <= 0 || cafFile.size > MAX_CAF_BYTES) {
      return NextResponse.json({ error: 'Archivo CAF inválido o demasiado grande' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(auth.user.id);
    const { data: integration, error: integrationError } = await supabase
      .from('sii_integrations')
      .select('environment,company_rut')
      .eq('organization_id', auth.organizationId)
      .maybeSingle();

    if (integrationError) {
      console.error('[sii-cafs] integration read failed', { code: integrationError.code });
      return NextResponse.json({ error: 'No se pudo leer la configuración SII' }, { status: 500 });
    }
    if (!integration?.company_rut) {
      return NextResponse.json({ error: 'SII_CAF_CONFIGURATION_REQUIRED' }, { status: 409 });
    }

    const parsed = parseAndValidateSiiCaf(await cafFile.text(), integration.company_rut);
    const environment = integration.environment || 'certification';
    const { data: cafId, error: saveError } = await supabase.rpc('save_sii_caf_v1', {
      p_organization_id: auth.organizationId,
      p_environment: environment,
      p_company_rut: parsed.companyRut,
      p_document_type: parsed.documentType,
      p_range_start: parsed.rangeStart,
      p_range_end: parsed.rangeEnd,
      p_authorization_date: parsed.authorizationDate,
      p_caf_version: parsed.cafVersion,
      p_key_id: parsed.keyId,
      p_signature_algorithm: parsed.signatureAlgorithm,
      p_fingerprint_sha256: parsed.fingerprintSha256,
      p_secret_payload: parsed.authorizationXml,
    });

    if (saveError) {
      const message = saveError.message || '';
      if (message.includes('superpone')) {
        return NextResponse.json({ error: 'SII_CAF_RANGE_OVERLAP' }, { status: 409 });
      }
      if (message.includes('RUT del CAF')) {
        return NextResponse.json({ error: 'SII_CAF_COMPANY_RUT_MISMATCH' }, { status: 400 });
      }
      console.error('[sii-cafs] save failed', { code: saveError.code });
      return NextResponse.json({ error: 'No se pudo guardar el CAF' }, { status: 500 });
    }

    const { data: stored, error: readError } = await supabase
      .from('sii_cafs')
      .select('id,environment,company_rut,document_type,range_start,range_end,next_folio,authorization_date,caf_version,key_id,signature_algorithm,fingerprint_sha256,status,uploaded_at,exhausted_at')
      .eq('organization_id', auth.organizationId)
      .eq('id', cafId)
      .single();

    if (readError || !stored) {
      console.error('[sii-cafs] read-after-write failed', { code: readError?.code });
      return NextResponse.json({ error: 'CAF guardado, pero no se pudo leer su metadata' }, { status: 500 });
    }

    return NextResponse.json(publicCaf(stored));
  } catch (error) {
    const code = error instanceof Error ? error.message : 'SII_CAF_VALIDATION_FAILED';
    const userErrors = new Set([
      'SII_CAF_INVALID_XML',
      'SII_CAF_REQUIRED_FIELDS_MISSING',
      'SII_CAF_VERSION_UNSUPPORTED',
      'SII_CAF_SIGNATURE_ALGORITHM_UNSUPPORTED',
      'SII_CAF_AUTHORIZATION_DATE_INVALID',
      'SII_CAF_COMPANY_RUT_MISMATCH',
      'SII_CAF_DOCUMENT_TYPE_INVALID',
      'SII_CAF_RANGE_INVALID',
      'SII_CAF_KEY_ID_INVALID',
      'SII_CAF_PRIVATE_KEY_INVALID',
      'SII_CAF_PRIVATE_KEY_NOT_RSA',
      'SII_CAF_PUBLIC_KEY_INVALID',
      'SII_CAF_PRIVATE_PUBLIC_KEY_MISMATCH',
      'SII_COMPANY_RUT_INVALID',
    ]);
    return NextResponse.json(
      { error: userErrors.has(code) ? code : 'No se pudo validar el CAF del SII' },
      { status: userErrors.has(code) ? 400 : 500 },
    );
  }
}
