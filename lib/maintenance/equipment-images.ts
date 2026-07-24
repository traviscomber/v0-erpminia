/**
 * Maps equipment family/category keywords to a local image path.
 * Used in the Ficha component to show a representative photo of the equipment.
 */

const EQUIPMENT_IMAGE_MAP: { keywords: string[]; image: string }[] = [
  {
    keywords: ['camioneta', 'pickup', 'hilux', 'ranger', 'l200', 'amarok', 'camionetas'],
    image: '/equipment/camioneta-4x4.png',
  },
  {
    keywords: ['camion', 'camiones', 'camin', 'cargo', 'volvo', 'mercedes', 'scania', 'kenworth', 'freightliner', 'bajo perfil camion'],
    image: '/equipment/camion-minero.png',
  },
  {
    keywords: ['cargador bajo perfil', 'scoop', 'lhd', 'bajo perfil', 'loader underground'],
    image: '/equipment/cargador-bajo-perfil.png',
  },
  {
    keywords: ['cargador frontal', 'cargadores frontales', 'wheel loader', 'pala cargadora'],
    image: '/equipment/cargador-frontal.png',
  },
  {
    keywords: ['compresor', 'compresores', 'air compressor', 'atlas copco xrvs'],
    image: '/equipment/compresor.png',
  },
  {
    keywords: ['generador', 'grupo generador', 'grupos generadores', 'grupos electrogenos', 'electrogeno', 'generator'],
    image: '/equipment/grupo-generador.png',
  },
  {
    keywords: ['perforadora', 'perforacion', 'perforadoras', 'jumbo', 'drill', 'sondaje', 'sondajes'],
    image: '/equipment/perforadora.png',
  },
  {
    keywords: ['excavadora', 'retroexcavadora', 'excavadoras', 'retroexcavadoras', 'backhoe'],
    image: '/equipment/excavadora.png',
  },
  {
    keywords: ['manipulador telescopico', 'manipuladores telescopicos', 'telehandler', 'manitou', 'telescopico'],
    image: '/equipment/manipulador-telescopico.png',
  },
  {
    keywords: ['minicargador', 'minicargadores', 'bobcat', 'skid steer', 'mini cargador'],
    image: '/equipment/minicargador.png',
  },
];

/**
 * Returns a representative image path for the given equipment name/family/type.
 * Falls back to null if no match is found.
 */
export function getEquipmentImage(text: string | null | undefined): string | null {
  if (!text) return null;

  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  for (const entry of EQUIPMENT_IMAGE_MAP) {
    if (entry.keywords.some((kw) => normalized.includes(kw))) {
      return entry.image;
    }
  }

  return null;
}
