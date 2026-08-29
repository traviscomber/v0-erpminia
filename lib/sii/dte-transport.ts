import { signSiiSeed, type StoredSiiCertificate } from '@/lib/sii/client';
import { formatSiiDteQueryDate, splitSiiRut } from '@/lib/sii/dte';

export type SiiEnvironment = 'certification' | 'production';

const TIMEOUT_MS = 20_000;
const SII_HOSTS: Record<SiiEnvironment, string> = {
  certification: 'maullin.sii.cl',
  production: 'palena.sii.cl',
};

export type SiiDteUploadResult = {
  status: string;
  trackId: string | null;
  glosa: string | null;
  rawResponse: string;
  latencyMs: number;
};

export type SiiDteQueryResult = {
  siiStatus: string | null;
  glosa: string | null;
  rawResponse: string;
  normalizedState: 'processing' | 'accepted' | 'rejected' | 'error';
  latencyMs: number;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
}

function extractTag(xml: string, tag: string) {
  const decoded = decodeXmlEntities(xml);
  const match = decoded.match(new RegExp(`<(?:[A-Za-z0-9_-]+:)?${tag}(?:\\s[^>]*)?>\\s*([\\s\\S]*?)\\s*</(?:[A-Za-z0-9_-]+:)?${tag}>`, 'i'));
  return match?.[1] == null ? null : decodeXmlEntities(match[1].trim());
}

function soapEnvelope(namespace: string, operation: string, body = '') {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<soapenv:Body><ns1:${operation} soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:ns1="${namespace}">${body}</ns1:${operation}></soapenv:Body>` +
    `</soapenv:Envelope>`
  );
}

async function fetchText(url: string, init: RequestInit, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { ...init, cache: 'no-store', signal: controller.signal });
    return {
      ok: response.ok,
      status: response.status,
      text: await response.text(),
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('SII_TIMEOUT');
    throw new Error('SII_CONNECTION_FAILED');
  } finally {
    clearTimeout(timeout);
  }
}

async function postSoap(endpoint: string, namespace: string, operation: string, body = '') {
  return fetchText(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'text/xml; charset=utf-8',
      soapaction: '""',
      'user-agent': 'MOTIL-SII/1.0',
    },
    body: soapEnvelope(namespace, operation, body),
  });
}

export function siiDteHost(environment: SiiEnvironment) {
  const host = SII_HOSTS[environment];
  if (!host) throw new Error('SII_ENVIRONMENT_INVALID');
  return host;
}

export async function requestSiiSessionToken(environment: SiiEnvironment, bundle: StoredSiiCertificate) {
  const host = siiDteHost(environment);
  const seedEndpoint = `https://${host}/DTEWS/CrSeed.jws`;
  const tokenEndpoint = `https://${host}/DTEWS/GetTokenFromSeed.jws`;

  const seedResponse = await postSoap(seedEndpoint, seedEndpoint, 'getSeed');
  const seed = extractTag(seedResponse.text, 'SEMILLA') || extractTag(seedResponse.text, 'SEED');
  const seedState = extractTag(seedResponse.text, 'ESTADO');
  if (!seedResponse.ok || !seed || (seedState && seedState !== '00') || !/^\d+$/.test(seed)) {
    throw new Error(`SII_SEED_REJECTED${seedState ? `:${seedState}` : ''}`);
  }

  const signedSeed = signSiiSeed(seed, bundle);
  const tokenBody = `<pszXml xsi:type="xsd:string">${escapeXml(signedSeed)}</pszXml>`;
  const tokenResponse = await postSoap(tokenEndpoint, tokenEndpoint, 'getToken', tokenBody);
  const token = extractTag(tokenResponse.text, 'TOKEN');
  const tokenState = extractTag(tokenResponse.text, 'ESTADO');
  if (!tokenResponse.ok || !token || (tokenState && tokenState !== '00')) {
    throw new Error(`SII_TOKEN_REJECTED${tokenState ? `:${tokenState}` : ''}`);
  }

  return token;
}

export async function uploadSiiDteEnvelope(input: {
  environment: SiiEnvironment;
  token: string;
  signerRut: string;
  companyRut: string;
  envelopeXml: string;
}): Promise<SiiDteUploadResult> {
  const host = siiDteHost(input.environment);
  const signer = splitSiiRut(input.signerRut);
  const company = splitSiiRut(input.companyRut);
  if (!input.token.trim()) throw new Error('SII_TOKEN_REQUIRED');
  if (!input.envelopeXml.trim()) throw new Error('SII_DTE_ENVELOPE_REQUIRED');

  const form = new FormData();
  form.set('rutSender', signer.body);
  form.set('dvSender', signer.dv);
  form.set('rutCompany', company.body);
  form.set('dvCompany', company.dv);
  form.set('archivo', new Blob([Buffer.from(input.envelopeXml, 'latin1')], { type: 'text/xml' }), 'envio_dte.xml');

  const response = await fetchText(`https://${host}/cgi_dte/UPL/DTEUpload`, {
    method: 'POST',
    headers: {
      cookie: `TOKEN=${input.token}`,
      'user-agent': 'PROG 1.0 MOTIL-SII/1.0',
    },
    body: form,
  }, 30_000);

  const status = extractTag(response.text, 'STATUS');
  const trackId = extractTag(response.text, 'TRACKID');
  const glosa = extractTag(response.text, 'GLOSA');
  if (!response.ok || status == null) throw new Error(`SII_DTE_UPLOAD_INVALID_RESPONSE:${response.status}`);
  if (status === '0' && !trackId) throw new Error('SII_DTE_UPLOAD_TRACKID_MISSING');

  return { status, trackId, glosa, rawResponse: response.text, latencyMs: response.latencyMs };
}

export async function querySiiUploadStatus(input: {
  environment: SiiEnvironment;
  token: string;
  companyRut: string;
  trackId: string;
}) {
  const host = siiDteHost(input.environment);
  const company = splitSiiRut(input.companyRut);
  if (!input.trackId.trim()) throw new Error('SII_DTE_TRACKID_REQUIRED');
  const endpoint = `https://${host}/DTEWS/QueryEstUp.jws`;
  const body =
    `<RutCompania xsi:type="xsd:string">${company.body}</RutCompania>` +
    `<DvCompania xsi:type="xsd:string">${company.dv}</DvCompania>` +
    `<TrackId xsi:type="xsd:string">${escapeXml(input.trackId.trim())}</TrackId>` +
    `<Token xsi:type="xsd:string">${escapeXml(input.token)}</Token>`;
  const response = await postSoap(endpoint, endpoint, 'getEstUp', body);
  if (!response.ok) throw new Error(`SII_DTE_UPLOAD_STATUS_FAILED:${response.status}`);
  const returnXml = extractTag(response.text, 'getEstUpReturn') || response.text;
  return {
    siiStatus: extractTag(returnXml, 'ESTADO'),
    glosa: extractTag(returnXml, 'GLOSA'),
    rawResponse: returnXml,
    latencyMs: response.latencyMs,
  };
}

const REJECTED_DTE_STATES = new Set(['DNK', 'FAU', 'FNA', 'FAN', 'EMP']);

export function normalizeSiiDteState(siiStatus: string | null): SiiDteQueryResult['normalizedState'] {
  const status = String(siiStatus || '').trim().toUpperCase();
  if (status === 'DOK') return 'accepted';
  if (REJECTED_DTE_STATES.has(status)) return 'rejected';
  if (!status) return 'error';
  return 'processing';
}

export async function querySiiDteStatus(input: {
  environment: SiiEnvironment;
  token: string;
  signerRut: string;
  companyRut: string;
  recipientRut: string;
  documentType: number;
  folio: number;
  issueDate: string;
  totalAmount: number;
}): Promise<SiiDteQueryResult> {
  const host = siiDteHost(input.environment);
  const signer = splitSiiRut(input.signerRut);
  const company = splitSiiRut(input.companyRut);
  const recipient = splitSiiRut(input.recipientRut);
  if (!Number.isSafeInteger(input.documentType) || input.documentType <= 0) throw new Error('SII_DTE_DOCUMENT_TYPE_INVALID');
  if (!Number.isSafeInteger(input.folio) || input.folio <= 0) throw new Error('SII_DTE_FOLIO_INVALID');
  if (!Number.isSafeInteger(input.totalAmount) || input.totalAmount < 0) throw new Error('SII_DTE_TOTALS_INVALID');

  const endpoint = `https://${host}/DTEWS/QueryEstDte.jws`;
  const body =
    `<RutConsultante xsi:type="xsd:string">${signer.body}</RutConsultante>` +
    `<DvConsultante xsi:type="xsd:string">${signer.dv}</DvConsultante>` +
    `<RutCompania xsi:type="xsd:string">${company.body}</RutCompania>` +
    `<DvCompania xsi:type="xsd:string">${company.dv}</DvCompania>` +
    `<RutReceptor xsi:type="xsd:string">${recipient.body}</RutReceptor>` +
    `<DvReceptor xsi:type="xsd:string">${recipient.dv}</DvReceptor>` +
    `<TipoDte xsi:type="xsd:string">${input.documentType}</TipoDte>` +
    `<FolioDte xsi:type="xsd:string">${input.folio}</FolioDte>` +
    `<FechaEmisionDte xsi:type="xsd:string">${formatSiiDteQueryDate(input.issueDate)}</FechaEmisionDte>` +
    `<MontoDte xsi:type="xsd:string">${input.totalAmount}</MontoDte>` +
    `<Token xsi:type="xsd:string">${escapeXml(input.token)}</Token>`;
  const response = await postSoap(endpoint, endpoint, 'getEstDte', body);
  if (!response.ok) throw new Error(`SII_DTE_STATUS_FAILED:${response.status}`);
  const returnXml = extractTag(response.text, 'getEstDteReturn') || response.text;
  const siiStatus = extractTag(returnXml, 'ESTADO');
  const glosa = extractTag(returnXml, 'GLOSA');
  return {
    siiStatus,
    glosa,
    rawResponse: returnXml,
    normalizedState: normalizeSiiDteState(siiStatus),
    latencyMs: response.latencyMs,
  };
}
