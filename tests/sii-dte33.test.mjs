import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260829161320_add_sii_dte33_outbound_v1.sql', 'utf8');
const engine = fs.readFileSync('lib/sii/dte.ts', 'utf8');
const transport = fs.readFileSync('lib/sii/dte-transport.ts', 'utf8');
const issuerApi = fs.readFileSync('app/api/sii/issuer/route.ts', 'utf8');
const dteApi = fs.readFileSync('app/api/sii/dte33/route.ts', 'utf8');
const submitApi = fs.readFileSync('app/api/sii/dte33/[id]/submit/route.ts', 'utf8');
const statusApi = fs.readFileSync('app/api/sii/dte33/[id]/status/route.ts', 'utf8');

test('outbound DTE ledger is separate from supplier AP and server only', () => {
  assert.match(migration, /create table public\.sii_outbound_dtes/);
  assert.match(migration, /alter table public\.sii_outbound_dtes enable row level security/);
  assert.match(migration, /revoke all on public\.sii_outbound_dtes from public, anon, authenticated/);
  assert.match(migration, /revoke insert, update, delete on public\.sii_outbound_dtes from service_role/);
  assert.match(migration, /grant select on public\.sii_outbound_dtes to service_role/);
  assert.doesNotMatch(migration, /procurement_supplier_invoices|procurement_supplier_invoice_lines/);
  assert.doesNotMatch(dteApi, /procurement_supplier_invoices|procurement_supplier_invoice_lines/);
});

test('signed DTE persistence consumes exactly the reserved folio transactionally', () => {
  assert.match(migration, /save_sii_signed_dte_v1/);
  assert.match(migration, /for update/);
  assert.match(migration, /v_reservation\.document_type <> 33/);
  assert.match(migration, /v_reservation\.caf_id <> p_caf_id or v_reservation\.folio <> p_folio/);
  assert.match(migration, /v_reservation\.idempotency_key <> btrim\(p_idempotency_key\)/);
  assert.match(migration, /insert into public\.sii_outbound_dtes/);
  assert.match(migration, /update public\.sii_folio_reservations[\s\S]*set status = 'used'/);
  assert.match(migration, /reference = 'sii_dte:' \|\| v_id::text/);
  assert.match(migration, /constraint sii_outbound_dtes_reservation_unique unique \(folio_reservation_id\)/);
  assert.match(migration, /constraint sii_outbound_dtes_folio_unique unique \(organization_id, environment, document_type, folio\)/);
});

test('DTE 33 generator builds taxed invoice, TED, document signature and EnvioDTE signature', () => {
  assert.match(engine, /SII_STANDARD_VAT_RATE = 19/);
  assert.match(engine, /items\.length < 1 \|\| items\.length > 60/);
  assert.match(engine, /<TipoDTE>33<\/TipoDTE>/);
  assert.match(engine, /<MntNeto>\$\{netAmount\}<\/MntNeto>/);
  assert.match(engine, /<TasaIVA>\$\{SII_STANDARD_VAT_RATE\}<\/TasaIVA>/);
  assert.match(engine, /<IVA>\$\{taxAmount\}<\/IVA>/);
  assert.match(engine, /<TED version="1\.0">/);
  assert.match(engine, /<FRMT algoritmo="SHA1withRSA">/);
  assert.match(engine, /createSign\('RSA-SHA1'\)/);
  assert.match(engine, /documentId = `F\$\{input\.folio\}T33`/);
  assert.match(engine, /signXmlReference\(documentSource, 'Documento', documentId/);
  assert.match(engine, /<SetDTE ID="SetDoc">/);
  assert.match(engine, /signXmlReference\(setDteSource, 'SetDTE', 'SetDoc'/);
  assert.match(engine, /EnvioDTE_v10\.xsd/);
  assert.match(engine, /encoding="ISO-8859-1"/);
  assert.match(engine, /America\/Santiago/);
});

test('issuer profile distinguishes company RUT from certificate holder RUT', () => {
  assert.match(migration, /add column if not exists signer_rut text/);
  assert.match(migration, /issuer_legal_name/);
  assert.match(migration, /resolution_date/);
  assert.match(issuerApi, /signerRut/);
  assert.match(engine, /<RutEmisor>\$\{escapeXml\(issuer\.companyRut\)\}<\/RutEmisor>/);
  assert.match(engine, /<RutEnvia>\$\{escapeXml\(issuer\.signerRut\)\}<\/RutEnvia>/);
});

test('SII transport follows official DTE upload and query parameter contracts', () => {
  assert.match(transport, /certification: 'maullin\.sii\.cl'/);
  assert.match(transport, /production: 'palena\.sii\.cl'/);
  assert.match(transport, /\/cgi_dte\/UPL\/DTEUpload/);
  assert.match(transport, /form\.set\('rutSender'/);
  assert.match(transport, /form\.set\('dvSender'/);
  assert.match(transport, /form\.set\('rutCompany'/);
  assert.match(transport, /form\.set\('dvCompany'/);
  assert.match(transport, /form\.set\('archivo'/);
  assert.match(transport, /cookie: `TOKEN=\$\{input\.token\}`/);
  assert.match(transport, /'user-agent': 'PROG 1\.0 MOTIL-SII\/1\.0'/);
  assert.match(transport, /QueryEstUp\.jws/);
  assert.match(transport, /RutCompania/);
  assert.match(transport, /TrackId/);
  assert.match(transport, /QueryEstDte\.jws/);
  for (const field of ['RutConsultante', 'DvConsultante', 'RutCompania', 'DvCompania', 'RutReceptor', 'DvReceptor', 'TipoDte', 'FolioDte', 'FechaEmisionDte', 'MontoDte', 'Token']) {
    assert.match(transport, new RegExp(field));
  }
  assert.match(transport, /status === 'DOK'/);
  assert.match(transport, /\['DNK', 'FAU', 'FNA', 'FAN', 'EMP'\]/);
});

test('creation and submission APIs are admin scoped and production requires explicit confirmation', () => {
  assert.match(dteApi, /requireAdmin\(request\)/);
  assert.match(dteApi, /reserve_sii_folio_v1/);
  assert.match(dteApi, /get_sii_caf_payload_v1/);
  assert.match(dteApi, /get_sii_certificate_payload_v1/);
  assert.match(dteApi, /save_sii_signed_dte_v1/);
  const publicProjection = dteApi.match(/function publicDte\(row: any\) \{[\s\S]*?\n\}/);
  assert.ok(publicProjection, 'DTE API must explicitly project public metadata');
  assert.doesNotMatch(publicProjection[0], /dte_xml|envelope_xml|payload|upload_response|last_status_response/);
  assert.match(submitApi, /requireAdmin\(request\)/);
  assert.match(submitApi, /dte\.environment === 'production' && body\?\.confirmProduction !== true/);
  assert.match(submitApi, /SII_PRODUCTION_CONFIRMATION_REQUIRED/);
  assert.match(submitApi, /requestSiiSessionToken/);
  assert.match(submitApi, /uploadSiiDteEnvelope/);
  assert.match(submitApi, /record_sii_dte_submission_v1/);
  assert.match(statusApi, /querySiiUploadStatus/);
  assert.match(statusApi, /querySiiDteStatus/);
  assert.match(statusApi, /record_sii_dte_status_v1/);
});

test('DTE mutation RPCs are service-role only', () => {
  for (const signature of [
    /save_sii_issuer_profile_v1\(uuid,text,text,text,text,text,text,text,date,integer\)/,
    /save_sii_signed_dte_v1\(uuid,text,uuid,uuid,bigint,text,text,text,text,date,bigint,numeric,bigint,bigint,jsonb,text,text\)/,
    /record_sii_dte_submission_v1\(uuid,uuid,text,text,text\)/,
    /record_sii_dte_status_v1\(uuid,uuid,text,text,text,text\)/,
  ]) {
    assert.match(migration, signature);
  }
  assert.doesNotMatch(migration, /grant execute on function public\.(?:save_sii_issuer_profile_v1|save_sii_signed_dte_v1|record_sii_dte_submission_v1|record_sii_dte_status_v1)[^;]* to authenticated/);
  assert.match(migration, /to service_role/);
});
