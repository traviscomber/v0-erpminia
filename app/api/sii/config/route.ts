export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import {
  inspectSiiCertificate,
  normalizeCompanyRut,
  type StoredSiiCertificate,
} from '@/lib/sii/client';

const MAX_CERTIFICATE_BYTES = 256 * 1024;
const MAX_PRIVATE_KEY_BYTES = 256 * 1024;

function publicConfig(row: any) {
  if (!row) return { configured: false, environment: 'certification' };
  return {
    configured: Boolean(row.certificate_secret_id),
    environment: row.environment || 'certification',
    companyRut: row.company_rut || null,
    certificateSubject: row.certificate_subject || null,
    certificateSerialNumber: row.certificate_serial_number || null,
    certificateFingerprintSha256: row.certificate_fingerprint_sha256 || null,
    certificateValidFrom: row.certificate_valid_from || null,
    certificateValidTo: row.certificate_valid_to || null,
    certificateUploadedAt: row.certificate_uploaded_at || null,
    lastAuthTestAt: row.last_auth_test_at || null,
    lastAuthOk: row.last_auth_ok ?? null,
    lastAuthError: row.last_auth_error || null,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  const supabase = getSupabaseServerClient(auth.user.id);
  const { data, error } = await supabase
    .from('sii_integrations')
    .select('environment,company_rut,certificate_secret_id,certificate_subject,certificate_serial_number,certificate_fingerprint_sha256,certificate_valid_from,certificate_valid_to,certificate_uploaded_at,last_auth_test_at,last_auth_ok,last_auth_error')
    .eq('organization_id', auth.organizationId)
    .maybeSingle();

  if (error) {
    console.error('[sii-config] read failed', { code: error.code });
    return NextResponse.json({ error: 'No se pudo leer la configuración SII' }, { status: 500 });
  }

  return NextResponse.json(publicConfig(data));
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  try {
    const form = await request.formData();
    const certificateFile = form.get('certificate');
    const privateKeyFile = form.get('privateKey');
    const passphraseValue = form.get('passphrase');
    const companyRutValue = form.get('companyRut');

    if (!(certificateFile instanceof File) || !(privateKeyFile instanceof File)) {
      return NextResponse.json({ error: 'Certificado y llave privada son obligatorios' }, { status: 400 });
    }
    if (certificateFile.size <= 0 || certificateFile.size > MAX_CERTIFICATE_BYTES) {
      return NextResponse.json({ error: 'Archivo de certificado inválido o demasiado grande' }, { status: 400 });
    }
    if (privateKeyFile.size <= 0 || privateKeyFile.size > MAX_PRIVATE_KEY_BYTES) {
      return NextResponse.json({ error: 'Archivo de llave privada inválido o demasiado grande' }, { status: 400 });
    }

    const companyRut = normalizeCompanyRut(String(companyRutValue || ''));
    const bundle: StoredSiiCertificate = {
      certificatePem: await certificateFile.text(),
      privateKeyPem: await privateKeyFile.text(),
      passphrase: typeof passphraseValue === 'string' && passphraseValue.length > 0 ? passphraseValue : undefined,
    };
    const metadata = inspectSiiCertificate(bundle);

    const supabase = getSupabaseServerClient(auth.user.id);
    const { error } = await supabase.rpc('save_sii_certificate_v1', {
      p_organization_id: auth.organizationId,
      p_company_rut: companyRut,
      p_secret_payload: JSON.stringify(bundle),
      p_subject: metadata.subject,
      p_serial_number: metadata.serialNumber,
      p_fingerprint_sha256: metadata.fingerprint256,
      p_valid_from: metadata.validFrom,
      p_valid_to: metadata.validTo,
    });

    if (error) {
      console.error('[sii-config] save failed', { code: error.code });
      return NextResponse.json({ error: 'No se pudo guardar el certificado SII' }, { status: 500 });
    }

    return NextResponse.json({
      configured: true,
      environment: 'certification',
      companyRut,
      certificateSubject: metadata.subject,
      certificateSerialNumber: metadata.serialNumber,
      certificateFingerprintSha256: metadata.fingerprint256,
      certificateValidFrom: metadata.validFrom,
      certificateValidTo: metadata.validTo,
      lastAuthTestAt: null,
      lastAuthOk: null,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'SII_CERTIFICATE_CONFIGURATION_FAILED';
    const userErrors = new Set([
      'SII_COMPANY_RUT_INVALID',
      'SII_CERTIFICATE_INVALID',
      'SII_PRIVATE_KEY_INVALID',
      'SII_CERTIFICATE_KEY_MISMATCH',
      'SII_CERTIFICATE_DATES_INVALID',
      'SII_CERTIFICATE_NOT_YET_VALID',
      'SII_CERTIFICATE_EXPIRED',
    ]);
    return NextResponse.json(
      { error: userErrors.has(code) ? code : 'No se pudo validar el certificado SII' },
      { status: userErrors.has(code) ? 400 : 500 },
    );
  }
}
