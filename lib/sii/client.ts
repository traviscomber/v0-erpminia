import {
  X509Certificate,
  createHash,
  createPrivateKey,
  createPublicKey,
  createSign,
  type KeyObject,
} from 'node:crypto';

export const SII_ENVIRONMENT = 'certification' as const;
export const SII_SEED_ENDPOINT = 'https://maullin.sii.cl/DTEWS/CrSeed.jws';
export const SII_TOKEN_ENDPOINT = 'https://maullin.sii.cl/DTEWS/GetTokenFromSeed.jws';
const SII_SEED_NAMESPACE = SII_SEED_ENDPOINT;
const SII_TOKEN_NAMESPACE = SII_TOKEN_ENDPOINT;
const TIMEOUT_MS = 10_000;

const XMLDSIG_NS = 'http://www.w3.org/2000/09/xmldsig#';
const C14N_ALGORITHM = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const RSA_SHA1_ALGORITHM = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
const SHA1_ALGORITHM = 'http://www.w3.org/2000/09/xmldsig#sha1';
const ENVELOPED_SIGNATURE_ALGORITHM = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';

export type StoredSiiCertificate = {
  certificatePem: string;
  privateKeyPem: string;
  passphrase?: string;
};

export type SiiCertificateMetadata = {
  subject: string;
  issuer: string;
  serialNumber: string;
  fingerprint256: string;
  validFrom: string;
  validTo: string;
};

export type SiiSeedResult = {
  seed: string;
  latencyMs: number;
};

export type SiiTokenResult = {
  token: string;
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
  const match = decoded.match(new RegExp(`<(?:[A-Za-z0-9_-]+:)?${tag}[^>]*>\\s*([^<]+?)\\s*</(?:[A-Za-z0-9_-]+:)?${tag}>`, 'i'));
  return match?.[1]?.trim() || null;
}

function soapEnvelope(namespace: string, operation: string, body = '') {
  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<soapenv:Body><ns1:${operation} soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:ns1="${namespace}">${body}</ns1:${operation}></soapenv:Body>` +
    `</soapenv:Envelope>`;
}

async function postSoap(endpoint: string, body: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'text/xml; charset=utf-8',
        soapaction: '""',
        'user-agent': 'MOTIL-SII/1.0',
      },
      body,
      cache: 'no-store',
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      text: await response.text(),
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('SII_TIMEOUT');
    }
    throw new Error('SII_CONNECTION_FAILED');
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestSiiSeed(): Promise<SiiSeedResult> {
  const response = await postSoap(SII_SEED_ENDPOINT, soapEnvelope(SII_SEED_NAMESPACE, 'getSeed'));
  const seed = extractTag(response.text, 'SEMILLA') || extractTag(response.text, 'SEED');
  const state = extractTag(response.text, 'ESTADO');

  if (!response.ok || !seed || (state && state !== '00')) {
    throw new Error(`SII_SEED_REJECTED${state ? `:${state}` : ''}`);
  }

  if (!/^\d+$/.test(seed)) {
    throw new Error('SII_SEED_INVALID');
  }

  return { seed, latencyMs: response.latencyMs };
}

function loadPrivateKey(bundle: StoredSiiCertificate): KeyObject {
  try {
    return createPrivateKey({
      key: bundle.privateKeyPem,
      format: 'pem',
      passphrase: bundle.passphrase || undefined,
    });
  } catch {
    throw new Error('SII_PRIVATE_KEY_INVALID');
  }
}

export function inspectSiiCertificate(bundle: StoredSiiCertificate): SiiCertificateMetadata {
  let certificate: X509Certificate;
  try {
    certificate = new X509Certificate(bundle.certificatePem);
  } catch {
    throw new Error('SII_CERTIFICATE_INVALID');
  }

  const privateKey = loadPrivateKey(bundle);
  const certificatePublicKey = certificate.publicKey.export({ format: 'der', type: 'spki' });
  const privatePublicKey = createPublicKey(privateKey).export({ format: 'der', type: 'spki' });

  if (!Buffer.from(certificatePublicKey).equals(Buffer.from(privatePublicKey))) {
    throw new Error('SII_CERTIFICATE_KEY_MISMATCH');
  }

  const validFromMs = Date.parse(certificate.validFrom);
  const validToMs = Date.parse(certificate.validTo);
  const now = Date.now();
  if (!Number.isFinite(validFromMs) || !Number.isFinite(validToMs)) {
    throw new Error('SII_CERTIFICATE_DATES_INVALID');
  }
  if (validFromMs > now) throw new Error('SII_CERTIFICATE_NOT_YET_VALID');
  if (validToMs <= now) throw new Error('SII_CERTIFICATE_EXPIRED');

  return {
    subject: certificate.subject,
    issuer: certificate.issuer,
    serialNumber: certificate.serialNumber,
    fingerprint256: certificate.fingerprint256,
    validFrom: new Date(validFromMs).toISOString(),
    validTo: new Date(validToMs).toISOString(),
  };
}

function base64UrlToBase64(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return base64 + '='.repeat((4 - (base64.length % 4)) % 4);
}

export function signSiiSeed(seed: string, bundle: StoredSiiCertificate) {
  if (!/^\d+$/.test(seed)) throw new Error('SII_SEED_INVALID');

  const certificate = new X509Certificate(bundle.certificatePem);
  const privateKey = loadPrivateKey(bundle);
  const certificatePublicJwk = certificate.publicKey.export({ format: 'jwk' });

  if (certificatePublicJwk.kty !== 'RSA' || !certificatePublicJwk.n || !certificatePublicJwk.e) {
    throw new Error('SII_CERTIFICATE_NOT_RSA');
  }

  const escapedSeed = escapeXml(seed);
  const unsignedTokenXml = `<getToken><item><Semilla>${escapedSeed}</Semilla></item></getToken>`;
  const digestValue = createHash('sha1').update(unsignedTokenXml, 'utf8').digest('base64');

  const signedInfoCanonical =
    `<SignedInfo xmlns="${XMLDSIG_NS}">` +
    `<CanonicalizationMethod Algorithm="${C14N_ALGORITHM}"></CanonicalizationMethod>` +
    `<SignatureMethod Algorithm="${RSA_SHA1_ALGORITHM}"></SignatureMethod>` +
    `<Reference URI=""><Transforms><Transform Algorithm="${ENVELOPED_SIGNATURE_ALGORITHM}"></Transform></Transforms>` +
    `<DigestMethod Algorithm="${SHA1_ALGORITHM}"></DigestMethod><DigestValue>${digestValue}</DigestValue></Reference>` +
    `</SignedInfo>`;

  const signer = createSign('RSA-SHA1');
  signer.update(signedInfoCanonical, 'utf8');
  signer.end();
  const signatureValue = signer.sign(privateKey).toString('base64');
  const modulus = base64UrlToBase64(certificatePublicJwk.n);
  const exponent = base64UrlToBase64(certificatePublicJwk.e);
  const certificateBase64 = certificate.raw.toString('base64');

  const signedInfoEmbedded = signedInfoCanonical.replace(` xmlns="${XMLDSIG_NS}"`, '');
  const signature =
    `<Signature xmlns="${XMLDSIG_NS}">${signedInfoEmbedded}` +
    `<SignatureValue>${signatureValue}</SignatureValue>` +
    `<KeyInfo><KeyValue><RSAKeyValue><Modulus>${modulus}</Modulus><Exponent>${exponent}</Exponent></RSAKeyValue></KeyValue>` +
    `<X509Data><X509Certificate>${certificateBase64}</X509Certificate></X509Data></KeyInfo></Signature>`;

  return `<?xml version="1.0"?><getToken><item><Semilla>${escapedSeed}</Semilla></item>${signature}</getToken>`;
}

export async function requestSiiToken(signedSeedXml: string): Promise<SiiTokenResult> {
  const requestBody = soapEnvelope(
    SII_TOKEN_NAMESPACE,
    'getToken',
    `<pszXml xsi:type="xsd:string">${escapeXml(signedSeedXml)}</pszXml>`,
  );
  const response = await postSoap(SII_TOKEN_ENDPOINT, requestBody);
  const token = extractTag(response.text, 'TOKEN');
  const state = extractTag(response.text, 'ESTADO');

  if (!response.ok || !token || (state && state !== '00')) {
    const glosa = extractTag(response.text, 'GLOSA');
    throw new Error(`SII_TOKEN_REJECTED${state ? `:${state}` : ''}${glosa ? `:${glosa.slice(0, 120)}` : ''}`);
  }

  return { token, latencyMs: response.latencyMs };
}

export function normalizeCompanyRut(input: string) {
  const raw = String(input || '').replace(/[.\s-]/g, '').toUpperCase();
  const match = raw.match(/^(\d{1,8})([0-9K])$/);
  if (!match) throw new Error('SII_COMPANY_RUT_INVALID');

  const body = match[1];
  const suppliedDv = match[2];
  let sum = 0;
  let factor = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const expectedDv = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  if (suppliedDv !== expectedDv) throw new Error('SII_COMPANY_RUT_INVALID');

  return `${Number(body)}-${suppliedDv}`;
}
