import { createHash, createPrivateKey, createPublicKey } from 'node:crypto';
import { normalizeCompanyRut } from '@/lib/sii/client';

export type SiiCafMetadata = {
  companyRut: string;
  documentType: number;
  rangeStart: number;
  rangeEnd: number;
  authorizationDate: string;
  cafVersion: string;
  keyId: number | null;
  signatureAlgorithm: string;
  fingerprintSha256: string;
};

export type ParsedSiiCaf = SiiCafMetadata & {
  authorizationXml: string;
  cafXml: string;
  privateKeyPem: string;
};

function decodeXmlEntities(value: string) {
  return value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
}

function extractTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  return match?.[1] == null ? null : decodeXmlEntities(match[1].trim());
}

function extractBlock(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?</${tag}>`, 'i'));
  return match?.[0] || null;
}

function extractAttribute(openingElement: string, name: string) {
  const match = openingElement.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match?.[1]?.trim() || null;
}

function decodeBase64(value: string, code: string) {
  try {
    const cleaned = value.replace(/\s+/g, '');
    if (!cleaned || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) throw new Error(code);
    return Buffer.from(cleaned, 'base64');
  } catch {
    throw new Error(code);
  }
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized + '='.repeat((4 - (normalized.length % 4)) % 4), 'base64');
}

function stripLeadingZeroes(value: Buffer) {
  let index = 0;
  while (index < value.length - 1 && value[index] === 0) index += 1;
  return value.subarray(index);
}

function normalizePem(raw: string) {
  const lines = decodeXmlEntities(raw)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return `${lines.join('\n')}\n`;
}

export function parseAndValidateSiiCaf(input: string, expectedCompanyRut?: string): ParsedSiiCaf {
  const authorizationXml = String(input || '').trim();
  if (!authorizationXml || !/<AUTORIZACION(?:\s|>)/i.test(authorizationXml)) {
    throw new Error('SII_CAF_INVALID_XML');
  }

  const cafXml = extractBlock(authorizationXml, 'CAF');
  const daXml = cafXml ? extractBlock(cafXml, 'DA') : null;
  const rangeXml = daXml ? extractBlock(daXml, 'RNG') : null;
  const publicKeyXml = daXml ? extractBlock(daXml, 'RSAPK') : null;
  const privateKeyRaw = extractTag(authorizationXml, 'RSASK');
  const topLevelPublicKeyRaw = extractTag(authorizationXml, 'RSAPUBK');
  const cafOpening = cafXml?.match(/<CAF\b[^>]*>/i)?.[0] || '';
  const frmaOpening = cafXml?.match(/<FRMA\b[^>]*>/i)?.[0] || '';

  if (!cafXml || !daXml || !rangeXml || !publicKeyXml || !privateKeyRaw || !topLevelPublicKeyRaw) {
    throw new Error('SII_CAF_REQUIRED_FIELDS_MISSING');
  }

  const cafVersion = extractAttribute(cafOpening, 'version');
  const companyRutRaw = extractTag(daXml, 'RE');
  const documentTypeRaw = extractTag(daXml, 'TD');
  const rangeStartRaw = extractTag(rangeXml, 'D');
  const rangeEndRaw = extractTag(rangeXml, 'H');
  const authorizationDate = extractTag(daXml, 'FA');
  const keyIdRaw = extractTag(daXml, 'IDK');
  const modulusRaw = extractTag(publicKeyXml, 'M');
  const exponentRaw = extractTag(publicKeyXml, 'E');
  const signature = extractTag(cafXml, 'FRMA');
  const signatureAlgorithm = extractAttribute(frmaOpening, 'algoritmo');

  if (!cafVersion || !companyRutRaw || !documentTypeRaw || !rangeStartRaw || !rangeEndRaw || !authorizationDate || !modulusRaw || !exponentRaw || !signature || !signatureAlgorithm) {
    throw new Error('SII_CAF_REQUIRED_FIELDS_MISSING');
  }
  if (cafVersion !== '1.0') throw new Error('SII_CAF_VERSION_UNSUPPORTED');
  if (signatureAlgorithm.toLowerCase() !== 'sha1withrsa') throw new Error('SII_CAF_SIGNATURE_ALGORITHM_UNSUPPORTED');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(authorizationDate) || !Number.isFinite(Date.parse(`${authorizationDate}T00:00:00Z`))) {
    throw new Error('SII_CAF_AUTHORIZATION_DATE_INVALID');
  }

  const companyRut = normalizeCompanyRut(companyRutRaw);
  if (expectedCompanyRut && companyRut !== normalizeCompanyRut(expectedCompanyRut)) {
    throw new Error('SII_CAF_COMPANY_RUT_MISMATCH');
  }

  const documentType = Number(documentTypeRaw);
  const rangeStart = Number(rangeStartRaw);
  const rangeEnd = Number(rangeEndRaw);
  const keyId = keyIdRaw == null || keyIdRaw === '' ? null : Number(keyIdRaw);
  if (!Number.isSafeInteger(documentType) || documentType <= 0 || documentType >= 1000) throw new Error('SII_CAF_DOCUMENT_TYPE_INVALID');
  if (!Number.isSafeInteger(rangeStart) || !Number.isSafeInteger(rangeEnd) || rangeStart <= 0 || rangeEnd < rangeStart) {
    throw new Error('SII_CAF_RANGE_INVALID');
  }
  if (keyId != null && (!Number.isSafeInteger(keyId) || keyId < 0)) throw new Error('SII_CAF_KEY_ID_INVALID');

  const privateKeyPem = normalizePem(privateKeyRaw);
  const topLevelPublicKeyPem = normalizePem(topLevelPublicKeyRaw);
  let privateKey;
  let topLevelPublicKey;
  try {
    privateKey = createPrivateKey(privateKeyPem);
  } catch {
    throw new Error('SII_CAF_PRIVATE_KEY_INVALID');
  }
  try {
    topLevelPublicKey = createPublicKey(topLevelPublicKeyPem);
  } catch {
    throw new Error('SII_CAF_PUBLIC_KEY_INVALID');
  }

  const privatePublicJwk = createPublicKey(privateKey).export({ format: 'jwk' });
  const topLevelPublicJwk = topLevelPublicKey.export({ format: 'jwk' });
  if (privatePublicJwk.kty !== 'RSA' || !privatePublicJwk.n || !privatePublicJwk.e) {
    throw new Error('SII_CAF_PRIVATE_KEY_NOT_RSA');
  }
  if (topLevelPublicJwk.kty !== 'RSA' || !topLevelPublicJwk.n || !topLevelPublicJwk.e) {
    throw new Error('SII_CAF_PUBLIC_KEY_INVALID');
  }

  const cafModulus = stripLeadingZeroes(decodeBase64(modulusRaw, 'SII_CAF_PUBLIC_KEY_INVALID'));
  const cafExponent = stripLeadingZeroes(decodeBase64(exponentRaw, 'SII_CAF_PUBLIC_KEY_INVALID'));
  const privateModulus = stripLeadingZeroes(decodeBase64Url(privatePublicJwk.n));
  const privateExponent = stripLeadingZeroes(decodeBase64Url(privatePublicJwk.e));
  const topLevelModulus = stripLeadingZeroes(decodeBase64Url(topLevelPublicJwk.n));
  const topLevelExponent = stripLeadingZeroes(decodeBase64Url(topLevelPublicJwk.e));
  if (
    !cafModulus.equals(privateModulus) ||
    !cafExponent.equals(privateExponent) ||
    !topLevelModulus.equals(privateModulus) ||
    !topLevelExponent.equals(privateExponent)
  ) {
    throw new Error('SII_CAF_PRIVATE_PUBLIC_KEY_MISMATCH');
  }

  return {
    authorizationXml,
    cafXml,
    privateKeyPem,
    companyRut,
    documentType,
    rangeStart,
    rangeEnd,
    authorizationDate,
    cafVersion,
    keyId,
    signatureAlgorithm,
    fingerprintSha256: createHash('sha256').update(authorizationXml, 'utf8').digest('hex'),
  };
}
