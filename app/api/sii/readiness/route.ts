export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

type ReadinessCheck = {
  key: string;
  label: string;
  ready: boolean;
  detail: string;
  externalInput: boolean;
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  const supabase = getSupabaseServerClient(auth.user.id);
  const [integrationResult, cafResult, certificationResult] = await Promise.all([
    supabase
      .from('sii_integrations')
      .select('environment,company_rut,signer_rut,certificate_secret_id,certificate_valid_to,last_auth_ok,issuer_legal_name,issuer_giro,issuer_acteco,issuer_address,issuer_commune,resolution_date,resolution_number')
      .eq('organization_id', auth.organizationId)
      .maybeSingle(),
    supabase
      .from('sii_cafs')
      .select('environment,document_type,range_end,next_folio,status')
      .eq('organization_id', auth.organizationId)
      .eq('document_type', 33)
      .eq('status', 'active'),
    supabase
      .from('sii_outbound_dtes')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', auth.organizationId)
      .eq('environment', 'certification')
      .eq('document_type', 33)
      .eq('status', 'accepted'),
  ]);

  if (integrationResult.error) {
    console.error('[sii-readiness] integration read failed', { code: integrationResult.error.code });
    return NextResponse.json({ error: 'No se pudo leer la configuración SII' }, { status: 500 });
  }
  if (cafResult.error) {
    console.error('[sii-readiness] CAF read failed', { code: cafResult.error.code });
    return NextResponse.json({ error: 'No se pudo leer el inventario CAF' }, { status: 500 });
  }
  if (certificationResult.error) {
    console.error('[sii-readiness] certification evidence read failed', { code: certificationResult.error.code });
    return NextResponse.json({ error: 'No se pudo leer la evidencia de certificación' }, { status: 500 });
  }

  const integration = integrationResult.data;
  const environment = integration?.environment || 'certification';
  const certificateValidTo = integration?.certificate_valid_to ? Date.parse(integration.certificate_valid_to) : Number.NaN;
  const certificateReady = Boolean(integration?.certificate_secret_id) && Number.isFinite(certificateValidTo) && certificateValidTo > Date.now();
  const issuerReady = Boolean(
    integration?.company_rut && integration?.signer_rut && integration?.issuer_legal_name && integration?.issuer_giro &&
    integration?.issuer_acteco && integration?.issuer_address && integration?.issuer_commune &&
    integration?.resolution_date && integration?.resolution_number != null,
  );
  const availableFolios = (cafResult.data || []).reduce((sum, caf) => {
    if (caf.environment !== environment) return sum;
    return sum + Math.max(0, Number(caf.range_end) - Number(caf.next_folio) + 1);
  }, 0);
  const cafReady = availableFolios > 0;
  const authReady = integration?.last_auth_ok === true;
  const certifiedDteCount = certificationResult.count || 0;

  const checks: ReadinessCheck[] = [
    {
      key: 'company_identity',
      label: 'RUT empresa',
      ready: Boolean(integration?.company_rut),
      detail: integration?.company_rut ? 'Identidad tributaria configurada.' : 'Pendiente del RUT real de la empresa.',
      externalInput: true,
    },
    {
      key: 'certificate',
      label: 'Certificado digital',
      ready: certificateReady,
      detail: certificateReady ? 'Certificado cargado y vigente.' : 'Pendiente de certificado PFX/P12 o PEM vigente.',
      externalInput: true,
    },
    {
      key: 'issuer_profile',
      label: 'Perfil tributario y firmante',
      ready: issuerReady,
      detail: issuerReady ? 'Emisor, ACTECO, resolución y RUT firmante configurados.' : 'Pendiente de datos tributarios y RUT del firmante autorizado.',
      externalInput: true,
    },
    {
      key: 'authentication',
      label: 'Autenticación SII',
      ready: authReady,
      detail: authReady ? 'Última autenticación con semilla y token fue exitosa.' : 'Se habilita cuando exista certificado y firmante reales.',
      externalInput: false,
    },
    {
      key: 'caf_33',
      label: 'CAF Factura Electrónica 33',
      ready: cafReady,
      detail: cafReady ? `${availableFolios} folios disponibles en ${environment}.` : 'Pendiente de CAF 33 real con folios disponibles.',
      externalInput: true,
    },
  ];

  const readyForCertification = checks.every((check) => check.ready);
  const readyForProduction = readyForCertification && certifiedDteCount > 0;
  const blockers = checks.filter((check) => !check.ready);

  return NextResponse.json({
    environment,
    readyForCertification,
    readyForProduction,
    waitingForExternalInputs: blockers.some((check) => check.externalInput),
    acceptedCertificationDtes: certifiedDteCount,
    availableDte33Folios: availableFolios,
    checks,
    productionGate: {
      ready: certifiedDteCount > 0,
      detail: certifiedDteCount > 0
        ? `${certifiedDteCount} DTE 33 aceptado(s) por SII en certificación.`
        : 'Producción queda pendiente hasta contar con al menos un DTE 33 aceptado por SII en certificación.',
    },
  });
}
