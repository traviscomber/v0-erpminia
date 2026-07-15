import type { SupabaseClient } from '@supabase/supabase-js';

export const CARPETA_ARRANQUE_DOCUMENTS = [
  'Certificado de afiliacion y cotizacion a Organismo Administrador',
  'Certificado de Accidentabilidad (ultimos 2 anos)',
  'Reglamento interno de orden, higiene y seguridad',
  'Copia IRL de todos sus colaboradores',
  'Contratos de trabajos de su personal',
  'Registro de entrega de EPP',
  'Registro interno de la empresa contratista',
  'Recepcion firmada del Sistema de Gestion y Seguridad en el Trabajo',
  'Examenes pre-ocupacionales (ultimos 3 anos)',
  'Examenes ocupacionales (agentes como ruido, silice)',
  'Documentacion de trabajadores extranjeros',
  'Procedimientos de trabajos actualizados con NRCT',
  'Procedimiento en caso de accidente',
  'Politica de empresa contratista en control de riesgos',
  'Copia carnet de identidad de todos los colaboradores',
  'Licencias de conduccion vigentes',
  'Recepcion de conductores por reglamento interno',
  'Programa de supervision a cargo personal',
  'Matriz de Identificacion de Peligros (MIPER)',
];

export function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizeRut(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, '');
}

export function normalizeRutDigits(value: unknown) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^0-9K]/g, '');
}

export function formatRutDisplay(value: unknown) {
  const clean = normalizeRutDigits(value);
  if (!clean) return '';

  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);

  if (!body) return clean;

  const groups: string[] = [];
  let remaining = body;
  while (remaining.length > 3) {
    groups.unshift(remaining.slice(-3));
    remaining = remaining.slice(0, -3);
  }
  if (remaining) {
    groups.unshift(remaining);
  }

  return `${groups.join('.')}-${verifier}`;
}

export async function ensureDocumentSlots(
  supabase: SupabaseClient,
  carpetaId: string
) {
  const { data: existingSlots, error: slotsLookupError } = await supabase
    .from('carpeta_documentos')
    .select('slot_index')
    .eq('carpeta_id', carpetaId);

  if (slotsLookupError) {
    throw slotsLookupError;
  }

  const usedSlots = new Set((existingSlots || []).map((slot) => Number(slot.slot_index)));
  const slots = CARPETA_ARRANQUE_DOCUMENTS
    .map((nombre, i) => ({
      carpeta_id: carpetaId,
      slot_index: i + 1,
      documento_nombre: nombre,
    }))
    .filter((slot) => !usedSlots.has(slot.slot_index));

  if (slots.length === 0) {
    return { inserted: 0, total: CARPETA_ARRANQUE_DOCUMENTS.length };
  }

  const { error: insertError } = await supabase.from('carpeta_documentos').insert(slots);
  if (insertError) {
    throw insertError;
  }

  return { inserted: slots.length, total: CARPETA_ARRANQUE_DOCUMENTS.length };
}
