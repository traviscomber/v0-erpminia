import { listTechnicalSheetReferences, type TechnicalSheetReference } from '@/lib/maintenance/technical-sheet-library';

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeKey(value: string | null | undefined) {
  return normalizeText(value).replace(/\s+/g, '');
}

const BRAND_GROUPS = [
  ['cat', 'caterpillar'],
  ['mitsubishi', 'mitsubishi fuso', 'fuso'],
  ['vw', 'volkswagen', 'volkswagen camiones y buses'],
  ['ford', 'ford trucks'],
  ['atlas copco'],
  ['jcb'],
  ['xcmg'],
  ['volvo'],
  ['chevrolet'],
  ['ghh'],
  ['paus'],
  ['komatsu'],
  ['doosan'],
  ['cummins'],
  ['liugong'],
  ['epiroc'],
  ['sandvik'],
] as const;

function brandGroup(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return BRAND_GROUPS.find((group) => group.some((alias) => normalized === alias || normalized.includes(alias))) || null;
}

function textBrandGroups(text: string) {
  const normalized = ` ${normalizeText(text)} `;
  return BRAND_GROUPS.filter((group) => group.some((alias) => normalized.includes(` ${alias} `)));
}

function brandsCompatible(text: string, reference: TechnicalSheetReference) {
  const explicit = textBrandGroups(text);
  if (explicit.length === 0) return true;
  const referenceGroup = brandGroup(reference.brand);
  return Boolean(referenceGroup && explicit.some((group) => group === referenceGroup));
}

function signalScore(reference: TechnicalSheetReference, text: string) {
  const normalizedText = normalizeText(text);
  const normalizedKey = normalizeKey(text);
  const modelText = normalizeText(reference.model);
  const modelKey = normalizeKey(reference.model);
  let best = 0;

  if (modelText && normalizedText.includes(modelText)) best = Math.max(best, 100 + modelKey.length);
  if (modelKey && modelKey.length >= 4 && normalizedKey.includes(modelKey)) best = Math.max(best, 90 + modelKey.length);

  for (const alias of reference.aliases) {
    const aliasText = normalizeText(alias);
    const aliasKey = normalizeKey(alias);
    if (!aliasText || !aliasKey) continue;

    const containsDigit = /\d/.test(aliasKey);
    const multiToken = aliasText.includes(' ');
    const includesReferenceBrand = brandGroup(aliasText) === brandGroup(reference.brand);
    const sufficientlySpecific = aliasKey.length >= 5 && (containsDigit || multiToken || includesReferenceBrand);
    if (!sufficientlySpecific) continue;

    if (normalizedText.includes(aliasText)) best = Math.max(best, 70 + aliasKey.length);
    else if (aliasKey.length >= 5 && normalizedKey.includes(aliasKey)) best = Math.max(best, 60 + aliasKey.length);
  }

  return best;
}

export function resolveExplicitTechnicalReference(text: string) {
  const ranked = listTechnicalSheetReferences()
    .filter((reference) => brandsCompatible(text, reference))
    .map((reference) => ({ reference, score: signalScore(reference, text) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.reference.model.length - a.reference.model.length);

  return ranked[0]?.reference || null;
}
