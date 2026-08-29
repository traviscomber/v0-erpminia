import {
  X509Certificate,
  createHash,
  createPrivateKey,
  createPublicKey,
  createSign,
  type KeyObject,
} from 'node:crypto';
import { parseAndValidateSiiCaf } from '@/lib/sii/caf';
import { normalizeCompanyRut, type StoredSiiCertificate } from '@/lib/sii/client';

const SII_DTE_NS = 'http://www.sii.cl/SiiDte';
const XMLDSIG_NS = 'http://www.w3.org/2000/09/xmldsig#';
const C14N_ALGORITHM = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const RSA_SHA1_ALGORITHM = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
const SHA1_ALGORITHM = 'http://www.w3.org/2000/09/xmldsig#sha1';
export const SII_DTE_RECEIVER_RUT = '60803000-K';
export const SII_STANDARD_VAT_RATE = 19;

export type SiiIssuerProfile = {
  companyRut: string;
  signerRut: string;
  legalName: string;
  giro: string;
  acteco: string;
  address: string;
  commune: string;
  city?: string | null;
  resolutionDate: string;
  resolutionNumber: number;
};

export type SiiDte33Recipient = {
  rut: string;
  legalName: string;
  giro: string;
  address: string;
  commune: string;
  city?: string | null;
};

export type SiiDte33Item = {
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  code?: string | null;
};

export type BuildSiiDte33Input = {
  folio: number;
  issueDate: string;
  paymentMethod: 1 | 2 | 3;
  dueDate?: string | null;
  issuer: SiiIssuerProfile;
  recipient: SiiDte33Recipient;
  items: SiiDte33Item[];
  cafAuthorizationXml: string;
  certificate: StoredSiiCertificate;
  timestamp?: Date;
};

export type SignedSiiDte33 = {
  documentId: string;
  folio: number;
  issueDate: string;
  recipientRut: string;
  recipientName: string;
  netAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  dteXml: string;
  envelopeXml: string;
  payload: {
    documentType: 33;
    paymentMethod: 1 | 2 | 3;
    dueDate: string | null;
    recipient: SiiDte33Recipient;
    items: Array<SiiDte33Item & { lineNumber: number; lineAmount: number }>;
  };
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function ensureLatin1(value: string, code: string) {
  for (const char of value) {
    const cp = char.codePointAt(0) || 0;
    if (cp > 255 || (cp < 32 && cp !== 9 && cp !== 10 && cp !== 13)) throw new Error(code);
  }
  return value;
}

function textField(value: string | null | undefined, max: number, code: string, required = true) {
  const normalized = String(value || '').trim();
  if (required && !normalized) throw new Error(code);
  if (!normalized) return '';
  ensureLatin1(normalized, code);
  if (normalized.length > max) throw new Error(code);
  return normalized;
}

function assertIsoDate(value: string, code: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(code);
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed)) throw new Error(code);
  const canonical = new Date(parsed).toISOString().slice(0, 10);
  if (canonical !== value) throw new Error(code);
  return value;
}

function formatChileTimestamp(date: Date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error('SII_DTE_TIMESTAMP_INVALID');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}-${pick('day')}T${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

function splitRut(rut: string) {
  const normalized = normalizeCompanyRut(rut);
  const [body, dv] = normalized.split('-');
  return { normalized, body, dv };
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

function certificateKeyInfo(bundle: StoredSiiCertificate) {
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

  const jwk = certificate.publicKey.export({ format: 'jwk' });
  if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) throw new Error('SII_CERTIFICATE_NOT_RSA');
  const toBase64 = (value: string) => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    return base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  };

  return {
    privateKey,
    modulus: toBase64(jwk.n),
    exponent: toBase64(jwk.e),
    certificateBase64: certificate.raw.toString('base64'),
  };
}

function signSha1Rsa(value: string, privateKey: KeyObject, encoding: BufferEncoding = 'utf8') {
  const signer = createSign('RSA-SHA1');
  signer.update(Buffer.from(value, encoding));
  signer.end();
  return signer.sign(privateKey).toString('base64');
}

function canonicalRoot(sourceXml: string, tag: string, namespace: string) {
  const prefix = `<${tag}`;
  if (!sourceXml.startsWith(prefix)) throw new Error('SII_DTE_CANONICALIZATION_FAILED');
  return sourceXml.replace(prefix, `<${tag} xmlns="${namespace}"`);
}

function signXmlReference(sourceXml: string, tag: string, id: string, bundle: StoredSiiCertificate) {
  const keyInfo = certificateKeyInfo(bundle);
  const canonicalReference = canonicalRoot(sourceXml, tag, SII_DTE_NS);
  const digestValue = createHash('sha1').update(canonicalReference, 'utf8').digest('base64');
  const signedInfoCanonical =
    `<SignedInfo xmlns="${XMLDSIG_NS}">` +
    `<CanonicalizationMethod Algorithm="${C14N_ALGORITHM}"></CanonicalizationMethod>` +
    `<SignatureMethod Algorithm="${RSA_SHA1_ALGORITHM}"></SignatureMethod>` +
    `<Reference URI="#${escapeXml(id)}"><Transforms><Transform Algorithm="${C14N_ALGORITHM}"></Transform></Transforms>` +
    `<DigestMethod Algorithm="${SHA1_ALGORITHM}"></DigestMethod><DigestValue>${digestValue}</DigestValue></Reference>` +
    `</SignedInfo>`;
  const signatureValue = signSha1Rsa(signedInfoCanonical, keyInfo.privateKey);
  const signedInfoEmbedded = signedInfoCanonical.replace(` xmlns="${XMLDSIG_NS}"`, '');
  return (
    `<Signature xmlns="${XMLDSIG_NS}">${signedInfoEmbedded}` +
    `<SignatureValue>${signatureValue}</SignatureValue>` +
    `<KeyInfo><KeyValue><RSAKeyValue><Modulus>${keyInfo.modulus}</Modulus><Exponent>${keyInfo.exponent}</Exponent></RSAKeyValue></KeyValue>` +
    `<X509Data><X509Certificate>${keyInfo.certificateBase64}</X509Certificate></X509Data></KeyInfo></Signature>`
  );
}

function normalizeIssuer(input: SiiIssuerProfile) {
  const companyRut = splitRut(input.companyRut).normalized;
  const signerRut = splitRut(input.signerRut).normalized;
  const legalName = textField(input.legalName, 100, 'SII_DTE_ISSUER_NAME_INVALID');
  const giro = textField(input.giro, 80, 'SII_DTE_ISSUER_GIRO_INVALID');
  const acteco = String(input.acteco || '').trim();
  if (!/^\d{1,6}$/.test(acteco)) throw new Error('SII_DTE_ISSUER_ACTECO_INVALID');
  const address = textField(input.address, 60, 'SII_DTE_ISSUER_ADDRESS_INVALID');
  const commune = textField(input.commune, 20, 'SII_DTE_ISSUER_COMMUNE_INVALID');
  const city = textField(input.city, 20, 'SII_DTE_ISSUER_CITY_INVALID', false) || null;
  const resolutionDate = assertIsoDate(input.resolutionDate, 'SII_DTE_RESOLUTION_DATE_INVALID');
  if (!Number.isSafeInteger(input.resolutionNumber) || input.resolutionNumber < 0) {
    throw new Error('SII_DTE_RESOLUTION_NUMBER_INVALID');
  }
  return { companyRut, signerRut, legalName, giro, acteco, address, commune, city, resolutionDate, resolutionNumber: input.resolutionNumber };
}

function normalizeRecipient(input: SiiDte33Recipient): SiiDte33Recipient {
  return {
    rut: splitRut(input.rut).normalized,
    legalName: textField(input.legalName, 100, 'SII_DTE_RECIPIENT_NAME_INVALID'),
    giro: textField(input.giro, 40, 'SII_DTE_RECIPIENT_GIRO_INVALID'),
    address: textField(input.address, 70, 'SII_DTE_RECIPIENT_ADDRESS_INVALID'),
    commune: textField(input.commune, 20, 'SII_DTE_RECIPIENT_COMMUNE_INVALID'),
    city: textField(input.city, 20, 'SII_DTE_RECIPIENT_CITY_INVALID', false) || null,
  };
}

function normalizeItems(items: SiiDte33Item[]) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 60) throw new Error('SII_DTE_ITEMS_INVALID');
  return items.map((item, index) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 999999999999) throw new Error('SII_DTE_ITEM_QUANTITY_INVALID');
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 999999999999) throw new Error('SII_DTE_ITEM_PRICE_INVALID');
    const lineAmount = Math.round(quantity * unitPrice);
    if (!Number.isSafeInteger(lineAmount) || lineAmount < 0) throw new Error('SII_DTE_ITEM_AMOUNT_INVALID');
    return {
      name: textField(item.name, 80, 'SII_DTE_ITEM_NAME_INVALID'),
      description: textField(item.description, 1000, 'SII_DTE_ITEM_DESCRIPTION_INVALID', false) || null,
      quantity,
      unitPrice,
      code: textField(item.code, 35, 'SII_DTE_ITEM_CODE_INVALID', false) || null,
      lineNumber: index + 1,
      lineAmount,
    };
  });
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) throw new Error('SII_DTE_NUMBER_INVALID');
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

export function buildAndSignSiiDte33(input: BuildSiiDte33Input): SignedSiiDte33 {
  if (!Number.isSafeInteger(input.folio) || input.folio <= 0 || input.folio > 9_999_999_999) {
    throw new Error('SII_DTE_FOLIO_INVALID');
  }
  const issueDate = assertIsoDate(input.issueDate, 'SII_DTE_ISSUE_DATE_INVALID');
  if (![1, 2, 3].includes(input.paymentMethod)) throw new Error('SII_DTE_PAYMENT_METHOD_INVALID');
  const dueDate = input.dueDate ? assertIsoDate(input.dueDate, 'SII_DTE_DUE_DATE_INVALID') : null;
  if (dueDate && dueDate < issueDate) throw new Error('SII_DTE_DUE_DATE_INVALID');

  const issuer = normalizeIssuer(input.issuer);
  const recipient = normalizeRecipient(input.recipient);
  const items = normalizeItems(input.items);
  const caf = parseAndValidateSiiCaf(input.cafAuthorizationXml, issuer.companyRut);
  if (caf.documentType !== 33) throw new Error('SII_DTE_CAF_DOCUMENT_TYPE_MISMATCH');
  if (input.folio < caf.rangeStart || input.folio > caf.rangeEnd) throw new Error('SII_DTE_FOLIO_OUTSIDE_CAF');

  certificateKeyInfo(input.certificate);

  const netAmount = items.reduce((sum, item) => sum + item.lineAmount, 0);
  const taxAmount = Math.round((netAmount * SII_STANDARD_VAT_RATE) / 100);
  const totalAmount = netAmount + taxAmount;
  if (![netAmount, taxAmount, totalAmount].every(Number.isSafeInteger)) throw new Error('SII_DTE_TOTALS_INVALID');

  const timestamp = formatChileTimestamp(input.timestamp || new Date());
  const documentId = `F${input.folio}T33`;

  const idDocXml =
    `<IdDoc><TipoDTE>33</TipoDTE><Folio>${input.folio}</Folio><FchEmis>${issueDate}</FchEmis>` +
    `<FmaPago>${input.paymentMethod}</FmaPago>${dueDate ? `<FchVenc>${dueDate}</FchVenc>` : ''}</IdDoc>`;
  const issuerXml =
    `<Emisor><RUTEmisor>${escapeXml(issuer.companyRut)}</RUTEmisor><RznSoc>${escapeXml(issuer.legalName)}</RznSoc>` +
    `<GiroEmis>${escapeXml(issuer.giro)}</GiroEmis><Acteco>${issuer.acteco}</Acteco>` +
    `<DirOrigen>${escapeXml(issuer.address)}</DirOrigen><CmnaOrigen>${escapeXml(issuer.commune)}</CmnaOrigen>` +
    `${issuer.city ? `<CiudadOrigen>${escapeXml(issuer.city)}</CiudadOrigen>` : ''}</Emisor>`;
  const recipientXml =
    `<Receptor><RUTRecep>${escapeXml(recipient.rut)}</RUTRecep><RznSocRecep>${escapeXml(recipient.legalName)}</RznSocRecep>` +
    `<GiroRecep>${escapeXml(recipient.giro)}</GiroRecep><DirRecep>${escapeXml(recipient.address)}</DirRecep>` +
    `<CmnaRecep>${escapeXml(recipient.commune)}</CmnaRecep>${recipient.city ? `<CiudadRecep>${escapeXml(recipient.city)}</CiudadRecep>` : ''}</Receptor>`;
  const totalsXml =
    `<Totales><MntNeto>${netAmount}</MntNeto><TasaIVA>${SII_STANDARD_VAT_RATE}</TasaIVA><IVA>${taxAmount}</IVA><MntTotal>${totalAmount}</MntTotal></Totales>`;
  const detailsXml = items.map((item) => {
    const codeXml = item.code ? `<CdgItem><TpoCodigo>INT1</TpoCodigo><VlrCodigo>${escapeXml(item.code)}</VlrCodigo></CdgItem>` : '';
    const descriptionXml = item.description ? `<DscItem>${escapeXml(item.description)}</DscItem>` : '';
    return (
      `<Detalle><NroLinDet>${item.lineNumber}</NroLinDet>${codeXml}<NmbItem>${escapeXml(item.name)}</NmbItem>${descriptionXml}` +
      `<QtyItem>${formatNumber(item.quantity)}</QtyItem><PrcItem>${formatNumber(item.unitPrice)}</PrcItem><MontoItem>${item.lineAmount}</MontoItem></Detalle>`
    );
  }).join('');

  const ddXml =
    `<DD><RE>${escapeXml(issuer.companyRut)}</RE><TD>33</TD><F>${input.folio}</F><FE>${issueDate}</FE>` +
    `<RR>${escapeXml(recipient.rut)}</RR><RSR>${escapeXml(recipient.legalName)}</RSR><MNT>${totalAmount}</MNT>` +
    `<IT1>${escapeXml(items[0].name)}</IT1>${caf.cafXml}<TSTED>${timestamp}</TSTED></DD>`;
  ensureLatin1(ddXml, 'SII_DTE_LATIN1_REQUIRED');
  const cafPrivateKey = createPrivateKey(caf.privateKeyPem);
  const frmt = signSha1Rsa(ddXml, cafPrivateKey, 'latin1');
  const tedXml = `<TED version="1.0">${ddXml}<FRMT algoritmo="SHA1withRSA">${frmt}</FRMT></TED>`;

  const documentSource =
    `<Documento ID="${documentId}"><Encabezado>${idDocXml}${issuerXml}${recipientXml}${totalsXml}</Encabezado>` +
    `${detailsXml}${tedXml}<TmstFirma>${timestamp}</TmstFirma></Documento>`;
  const documentSignature = signXmlReference(documentSource, 'Documento', documentId, input.certificate);
  const dteXml = `<DTE version="1.0">${documentSource}${documentSignature}</DTE>`;

  const caratula =
    `<Caratula version="1.0"><RutEmisor>${escapeXml(issuer.companyRut)}</RutEmisor><RutEnvia>${escapeXml(issuer.signerRut)}</RutEnvia>` +
    `<RutReceptor>${SII_DTE_RECEIVER_RUT}</RutReceptor><FchResol>${issuer.resolutionDate}</FchResol><NroResol>${issuer.resolutionNumber}</NroResol>` +
    `<TmstFirmaEnv>${timestamp}</TmstFirmaEnv><SubTotDTE><TpoDTE>33</TpoDTE><NroDTE>1</NroDTE></SubTotDTE></Caratula>`;
  const setDteSource = `<SetDTE ID="SetDoc">${caratula}${dteXml}</SetDTE>`;
  const envelopeSignature = signXmlReference(setDteSource, 'SetDTE', 'SetDoc', input.certificate);
  const envelopeXml =
    `<?xml version="1.0" encoding="ISO-8859-1"?>\n` +
    `<EnvioDTE xmlns="${SII_DTE_NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
    `xsi:schemaLocation="${SII_DTE_NS} EnvioDTE_v10.xsd" version="1.0">\n${setDteSource}\n${envelopeSignature}\n</EnvioDTE>`;
  ensureLatin1(envelopeXml, 'SII_DTE_LATIN1_REQUIRED');

  return {
    documentId,
    folio: input.folio,
    issueDate,
    recipientRut: recipient.rut,
    recipientName: recipient.legalName,
    netAmount,
    taxRate: SII_STANDARD_VAT_RATE,
    taxAmount,
    totalAmount,
    dteXml,
    envelopeXml,
    payload: {
      documentType: 33,
      paymentMethod: input.paymentMethod,
      dueDate,
      recipient,
      items,
    },
  };
}

export function splitSiiRut(rut: string) {
  return splitRut(rut);
}

export function formatSiiDteQueryDate(issueDate: string) {
  const iso = assertIsoDate(issueDate, 'SII_DTE_ISSUE_DATE_INVALID');
  return `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}`;
}
