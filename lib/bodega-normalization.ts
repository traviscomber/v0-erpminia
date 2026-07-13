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

export function formatCategoryLabel(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'Otros';
  return toTitleCase(trimmed);
}

export interface CategoryMeta {
  label: string;
  color: string;
}

// Each entry: [normalized_prefix, canonical_label, tailwind_color]
// Ordered longest-first so greedy matching works correctly.
const PREFIX_RULES: [string, string, string][] = [
  ['repuesto', 'Repuestos', 'bg-blue-500'],
  ['perforacion', 'Perforacion', 'bg-red-600'],
  ['ferreteria', 'Ferreteria', 'bg-orange-500'],
  ['activofijo', 'Activos Fijos', 'bg-zinc-500'],
  ['activo fijo', 'Activos Fijos', 'bg-zinc-500'],
  ['rodamiento', 'Rodamientos', 'bg-indigo-500'],
  ['neumatico', 'Neumaticos', 'bg-stone-500'],
  ['lubricante', 'Lubricantes', 'bg-teal-500'],
  ['soldadura', 'Soldadura', 'bg-rose-500'],
  ['explosivo', 'Explosivos', 'bg-red-700'],
  ['combustible', 'Combustible', 'bg-orange-700'],
  ['escritorio', 'Escritorio', 'bg-neutral-500'],
  ['reactivo', 'Reactivos', 'bg-violet-500'],
  ['sondaje', 'Sondaje', 'bg-amber-600'],
  ['electrico', 'Electrico', 'bg-yellow-500'],
  ['fitting', 'Fittings', 'bg-cyan-500'],
  ['filtro', 'Filtros', 'bg-green-500'],
  ['servtec', 'Servicios', 'bg-purple-500'],
  ['servicio', 'Servicios', 'bg-purple-500'],
  ['servi', 'Servicios', 'bg-purple-500'],
  ['acero', 'Aceros', 'bg-slate-500'],
  ['coraza', 'Correas', 'bg-pink-500'],
  ['correa', 'Correas', 'bg-pink-500'],
  ['bomba', 'Bombas', 'bg-sky-500'],
  ['compo', 'Componentes', 'bg-fuchsia-500'],
  ['viveres', 'Viveres', 'bg-emerald-500'],
  ['carnes', 'Viveres', 'bg-emerald-500'],
  ['madera', 'Materiales', 'bg-yellow-700'],
  ['malla', 'Materiales', 'bg-yellow-700'],
  ['lona', 'Materiales', 'bg-yellow-700'],
  ['cinta', 'Materiales', 'bg-yellow-700'],
  ['epp', 'EPP', 'bg-lime-500'],
  ['feria', 'Otros', 'bg-gray-400'],
  ['sacoi', 'Otros', 'bg-gray-400'],
  ['cear', 'Otros', 'bg-gray-400'],
  ['otros', 'Otros', 'bg-gray-400'],
];

/**
 * Given a raw part_code (e.g. "Acero042", "Electrico011"), returns the canonical category label.
 */
export function canonicalCategory(partCode: unknown): string {
  if (!partCode) return 'Otros';
  const lower = normalizeText(String(partCode));
  for (const [prefix, label] of PREFIX_RULES) {
    if (lower.startsWith(prefix)) return label;
  }
  return 'Otros';
}

/**
 * Returns color class for a canonical category label.
 */
export function getCategoryColor(label: string): string {
  for (const [, ruleLabel, color] of PREFIX_RULES) {
    if (ruleLabel === label) return color;
  }
  return 'bg-gray-400';
}

/**
 * Returns all unique canonical category labels in display order.
 */
export function getAllCategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const [, label] of PREFIX_RULES) {
    if (!seen.has(label)) {
      seen.add(label);
      result.push(label);
    }
  }
  return result;
}

export function categorySortKey(value: unknown) {
  return normalizeText(canonicalCategory(value));
}
