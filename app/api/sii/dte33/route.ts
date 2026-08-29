export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { buildAndSignSiiDte33, type SiiDte33Item, type StoredSiiCertificate } from '@/lib/sii/dte';

function publicDte(row: any) {
  return {
    id: row.id,
    environment: row.environment,
    documentType: Number(row.document_type),
    folio: Number(row.folio),
    documentId: row.document_id,
    status: row.status,
    recipientRut: row.recipient_rut,
    recipientName: row.recipient_name,
    issueDate: row.issue_date,
    netAmount: Number(row.net_amount),
    taxRate: Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    trackId: row.track_id || null,
    uploadStatus: row.upload_status || null,
    dteStatus: row.dte_status || null,
    dteStatusGlosa: row.dte_status_glosa || null,
    submissionAttempts: Number(row.submission_attempts || 0),
    submittedAt: row.submitted_at || null,
    lastStatusCheckedAt: row.last_status_checked_at || null,
    createdAt: row.created_at,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  const supabase = getSupabaseServerClient(auth.user.id);
  const { data, error } = await supabase
    .from('sii_outbound_dtes')
    .select('id,environment,document_type,folio,document_id,status,recipient_rut,recipient_name,issue_date,net_amount,tax_rate,tax_amount,total_amount,track_id,upload_status,dte_status,dte_status_glosa,submission_attempts,submitted_at,last_status_checked_at,created_at')
    .eq('organization_id', auth.organizationId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[sii-dte33] list failed', { code: error.code });
    return NextResponse.json({ error: 'No se pudo leer la bandeja DTE' }, { status: 500 });
  }
  return NextResponse.json({ dtes: (data || []).map(publicDte) });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return auth.response;

  const supabase = getSupabaseServerClient(auth.user.id);
  let idempotencyKey = '';
  try {
    const body = await request.json();
    idempotencyKey = String(body?.idempotencyKey || '').trim();
    if (!idempotencyKey || idempotencyKey.length > 128) {
      return NextResponse.json({ error: 'SII_DTE_IDEMPOTENCY_KEY_INVALID' }, { status: 400 });
    }

    const { data: integration, error: integrationError } = await supabase
      .from('sii_integrations')
      .select('environment,company_rut,signer_rut,issuer_legal_name,issuer_giro,issuer_acteco,issuer_address,issuer_commune,issuer_city,resolution_date,resolution_number,certificate_secret_id,certificate_valid_to')
      .eq('organization_id', auth.organizationId)
      .maybeSingle();
    if (integrationError) {
      console.error('[sii-dte33] integration read failed', { code: integrationError.code });
      return NextResponse.json({ error: 'No se pudo leer la configuración SII' }, { status: 500 });
    }
    if (!integration?.certificate_secret_id) {
      return NextResponse.json({ error: 'SII_CERTIFICATE_NOT_CONFIGURED' }, { status: 409 });
    }
    if (integration.certificate_valid_to && Date.parse(integration.certificate_valid_to) <= Date.now()) {
      return NextResponse.json({ error: 'SII_CERTIFICATE_EXPIRED' }, { status: 409 });
    }
    if (!integration.company_rut || !integration.signer_rut || !integration.issuer_legal_name || !integration.issuer_giro ||
        !integration.issuer_acteco || !integration.issuer_address || !integration.issuer_commune || !integration.resolution_date ||
        integration.resolution_number == null) {
      return NextResponse.json({ error: 'SII_ISSUER_PROFILE_REQUIRED' }, { status: 409 });
    }

    const environment = integration.environment === 'production' ? 'production' : 'certification';
    const { data: reservationData, error: reservationError } = await supabase.rpc('reserve_sii_folio_v1', {
      p_organization_id: auth.organizationId,
      p_environment: environment,
      p_document_type: 33,
      p_idempotency_key: idempotencyKey,
    });
    if (reservationError) {
      const message = reservationError.message || '';
      if (message.includes('No hay folios')) {
        return NextResponse.json({ error: 'SII_DTE_FOLIO_UNAVAILABLE' }, { status: 409 });
      }
      if (message.includes('otro tipo DTE')) {
        return NextResponse.json({ error: 'SII_DTE_IDEMPOTENCY_CONFLICT' }, { status: 409 });
      }
      console.error('[sii-dte33] folio reservation failed', { code: reservationError.code });
      return NextResponse.json({ error: 'No se pudo reservar folio SII' }, { status: 500 });
    }
    const reservation = Array.isArray(reservationData) ? reservationData[0] : reservationData;
    if (!reservation?.reservation_id || !reservation?.caf_id || !reservation?.folio) {
      return NextResponse.json({ error: 'SII_DTE_FOLIO_RESERVATION_INVALID' }, { status: 500 });
    }

    const [{ data: cafPayload, error: cafError }, { data: certificatePayload, error: certificateError }] = await Promise.all([
      supabase.rpc('get_sii_caf_payload_v1', {
        p_organization_id: auth.organizationId,
        p_caf_id: reservation.caf_id,
      }),
      supabase.rpc('get_sii_certificate_payload_v1', {
        p_organization_id: auth.organizationId,
      }),
    ]);
    if (cafError || typeof cafPayload !== 'string' || !cafPayload) {
      console.error('[sii-dte33] CAF secret read failed', { code: cafError?.code });
      return NextResponse.json({ error: 'SII_CAF_SECRET_UNAVAILABLE' }, { status: 500 });
    }
    if (certificateError || typeof certificatePayload !== 'string' || !certificatePayload) {
      console.error('[sii-dte33] certificate secret read failed', { code: certificateError?.code });
      return NextResponse.json({ error: 'SII_CERTIFICATE_SECRET_UNAVAILABLE' }, { status: 500 });
    }

    const signed = buildAndSignSiiDte33({
      folio: Number(reservation.folio),
      issueDate: String(body?.issueDate || ''),
      paymentMethod: Number(body?.paymentMethod) as 1 | 2 | 3,
      dueDate: body?.dueDate ? String(body.dueDate) : null,
      issuer: {
        companyRut: integration.company_rut,
        signerRut: integration.signer_rut,
        legalName: integration.issuer_legal_name,
        giro: integration.issuer_giro,
        acteco: integration.issuer_acteco,
        address: integration.issuer_address,
        commune: integration.issuer_commune,
        city: integration.issuer_city,
        resolutionDate: integration.resolution_date,
        resolutionNumber: Number(integration.resolution_number),
      },
      recipient: {
        rut: String(body?.recipient?.rut || ''),
        legalName: String(body?.recipient?.legalName || ''),
        giro: String(body?.recipient?.giro || ''),
        address: String(body?.recipient?.address || ''),
        commune: String(body?.recipient?.commune || ''),
        city: body?.recipient?.city ? String(body.recipient.city) : null,
      },
      items: Array.isArray(body?.items) ? body.items.map((item: any): SiiDte33Item => ({
        name: String(item?.name || ''),
        description: item?.description ? String(item.description) : null,
        quantity: Number(item?.quantity),
        unitPrice: Number(item?.unitPrice),
        code: item?.code ? String(item.code) : null,
      })) : [],
      cafAuthorizationXml: cafPayload,
      certificate: JSON.parse(certificatePayload) as StoredSiiCertificate,
    });

    const { data: dteId, error: saveError } = await supabase.rpc('save_sii_signed_dte_v1', {
      p_organization_id: auth.organizationId,
      p_environment: environment,
      p_reservation_id: reservation.reservation_id,
      p_caf_id: reservation.caf_id,
      p_folio: signed.folio,
      p_idempotency_key: idempotencyKey,
      p_document_id: signed.documentId,
      p_recipient_rut: signed.recipientRut,
      p_recipient_name: signed.recipientName,
      p_issue_date: signed.issueDate,
      p_net_amount: signed.netAmount,
      p_tax_rate: signed.taxRate,
      p_tax_amount: signed.taxAmount,
      p_total_amount: signed.totalAmount,
      p_payload: signed.payload,
      p_dte_xml: signed.dteXml,
      p_envelope_xml: signed.envelopeXml,
    });
    if (saveError) {
      const message = saveError.message || '';
      if (message.includes('ya fue usado')) {
        return NextResponse.json({ error: 'SII_DTE_FOLIO_ALREADY_USED' }, { status: 409 });
      }
      console.error('[sii-dte33] signed DTE save failed', { code: saveError.code });
      return NextResponse.json({ error: 'No se pudo guardar el DTE firmado' }, { status: 500 });
    }

    return NextResponse.json({
      id: dteId,
      environment,
      documentType: 33,
      folio: signed.folio,
      documentId: signed.documentId,
      status: 'signed',
      recipientRut: signed.recipientRut,
      recipientName: signed.recipientName,
      issueDate: signed.issueDate,
      netAmount: signed.netAmount,
      taxRate: signed.taxRate,
      taxAmount: signed.taxAmount,
      totalAmount: signed.totalAmount,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'SII_DTE_BUILD_FAILED';
    if (code.startsWith('SII_')) {
      return NextResponse.json({ error: code }, { status: 400 });
    }
    console.error('[sii-dte33] build failed');
    return NextResponse.json({ error: 'SII_DTE_BUILD_FAILED' }, { status: 500 });
  }
}
