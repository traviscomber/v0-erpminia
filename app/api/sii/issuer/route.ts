export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { normalizeCompanyRut } from '@/lib/sii/client';

function publicIssuer(row: any) {
  return {
    configured: Boolean(
      row?.company_rut && row?.signer_rut && row?.issuer_legal_name && row?.issuer_giro && row?.issuer_acteco &&
      row?.issuer_address && row?.issuer_commune && row?.resolution_date && row?.resolution_number != null,
    environment: row?.environment || 'certification',
    companyRut: row?.company_rut || null,
    signerRut: row?.signer_rut || null,
    legalName: row?.issuer_legal_name || null,
    giro: row?.issuer_giro || null,
    acteco: row?.issuer_acteco || null,
    address: row?.issuer_address || null,
    commune: row?.issuer_commune || null,
    city: row?.issuer_city || null,
    resolutionDate: row?.resolution_date || null,
    resolutionNumber: row?.resolution_number == null ? null : Number(row.resolution_number),
    updatedAt: row?.issuer_profile_updated_at || null,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  const supabase = getSupabaseServerClient(auth.user.id);
  const { data, error } = await supabase
    .from('sii_integrations')
    .select('environment,company_rut,signer_rut,issuer_legal_name,issuer_giro,issuer_acteco,issuer_address,issuer_commune,issuer_city,resolution_date,resolution_number,issuer_profile_updated_at')
    .eq('organization_id', auth.organizationId)
    .maybeSingle();

  if (error) {
    console.error('[sii-issuer] read failed', { code: error.code });
    return NextResponse.json({ error: 'No se pudo leer el perfil tributario SII' }, { status: 500 });
  }
  return NextResponse.json(publicIssuer(data));
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  try {
    const body = await request.json();
    const signerRut = normalizeCompanyRut(String(body?.signerRut || ''));
    const legalName = String(body?.legalName || '').trim();
    const giro = String(body?.giro || '').trim();
    const acteco = String(body?.acteco || '').trim();
    const address = String(body?.address || '').trim();
    const commune = String(body?.commune || '').trim();
    const city = String(body?.city || '').trim();
    const resolutionDate = String(body?.resolutionDate || '').trim();
    const resolutionNumber = Number(body?.resolutionNumber);

    if (!legalName || legalName.length > 100 || !giro || giro.length > 80 || !/^\d{1,6}$/.test(acteco) ||
        !address || address.length > 60 || !commune || commune.length > 20 || city.length > 20 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(resolutionDate) || !Number.isSafeInteger(resolutionNumber) || resolutionNumber < 0) {
      return NextResponse.json({ error: 'SII_ISSUER_PROFILE_INVALID' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(auth.user.id);
    const { data: integration, error: integrationError } = await supabase
      .from('sii_integrations')
      .select('company_rut')
      .eq('organization_id', auth.organizationId)
      .maybeSingle();
    if (integrationError) {
      console.error('[sii-issuer] integration read failed', { code: integrationError.code });
      return NextResponse.json({ error: 'No se pudo leer la configuración SII' }, { status: 500 });
    }
    if (!integration?.company_rut) {
      return NextResponse.json({ error: 'SII_CERTIFICATE_NOT_CONFIGURED' }, { status: 409 });
    }

    const { error } = await supabase.rpc('save_sii_issuer_profile_v1', {
      p_organization_id: auth.organizationId,
      p_signer_rut: signerRut,
      p_legal_name: legalName,
      p_giro: giro,
      p_acteco: acteco,
      p_address: address,
      p_commune: commune,
      p_city: city || null,
      p_resolution_date: resolutionDate,
      p_resolution_number: resolutionNumber,
    });
    if (error) {
      console.error('[sii-issuer] save failed', { code: error.code });
      return NextResponse.json({ error: 'No se pudo guardar el perfil tributario SII' }, { status: 500 });
    }

    return NextResponse.json({
      configured: true,
      companyRut: integration.company_rut,
      signerRut,
      legalName,
      giro,
      acteco,
      address,
      commune,
      city: city || null,
      resolutionDate,
      resolutionNumber,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'SII_ISSUER_PROFILE_INVALID';
    return NextResponse.json(
      { error: code === 'SII_COMPANY_RUT_INVALID' ? code : 'SII_ISSUER_PROFILE_INVALID' },
      { status: 400 },
    );
  }
}
