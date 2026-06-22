export function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

const CATEGORY_ALIASES: Record<string, string> = {
  ferreteria: 'Ferreteria',
  viveres: 'Viveres',
  neumatico: 'Neumatico',
  electrico: 'Electrico',
  lubricante: 'Lubricante',
  sondaje: 'Sondaje',
  epp: 'EPP',
};

export function canonicalCategory(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const normalized = normalizeText(raw).replace(/\s+/g, ' ');
  return CATEGORY_ALIASES[normalized] || toTitleCase(raw);
}

export function categorySortKey(value: unknown) {
  return normalizeText(canonicalCategory(value));
}
