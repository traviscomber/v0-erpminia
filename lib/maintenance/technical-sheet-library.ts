export type TechnicalSheetLibraryFault = {
  code: string;
  name: string;
  severity: string;
  symptom: string;
  cause: string;
  effect: string;
  recommendedAction: string;
};

export type TechnicalSheetLibraryComponent = {
  code: string;
  name: string;
  level: number;
  criticality: string;
  description: string;
  faults: TechnicalSheetLibraryFault[];
};

export type TechnicalSheetReference = {
  brand: string;
  model: string;
  family: string;
  aliases: string[];
  sourceUrl: string;
  sourceLabel: string;
  summary: string;
  keySpecs: Array<{ label: string; value: string }>;
  components: TechnicalSheetLibraryComponent[];
};

const TECHNICAL_SHEET_LIBRARY: TechnicalSheetReference[] = [
  {
    brand: 'Komatsu',
    model: 'WA380-8',
    family: 'Cargadores Frontales',
    aliases: ['wa380-8', 'wa380 8', 'komatsu wa380-8', 'komatsu wa380 8'],
    sourceUrl: 'https://www.komatsu.com/en-us/products/equipment/wheel-loaders/large-wheel-loaders/wa380-8',
    sourceLabel: 'Komatsu WA380-8',
    summary: 'Cargador frontal grande con motor diesel y capacidad de balde orientada a carguio, limpieza y apoyo operacional.',
    keySpecs: [
      { label: 'Potencia neta', value: '143 kW / 191 HP' },
      { label: 'Capacidad de balde', value: '2.7 - 3.3 m3' },
      { label: 'Peso operativo', value: '18.385 - 19.020 kg' },
      { label: 'Motor', value: 'Komatsu SAA6D107E-3' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Conjunto motriz principal del cargador frontal.',
        faults: [
          {
            code: 'ENG-OVERHEAT',
            name: 'Sobretemperatura de motor',
            severity: 'alta',
            symptom: 'Subida de temperatura y perdida de potencia',
            cause: 'Restriccion en enfriamiento, filtros sucios o bajo nivel de fluidos',
            effect: 'Detencion preventiva y riesgo de dano mayor',
            recommendedAction: 'Revisar radiador, ventilador, filtros y nivel de refrigerante',
          },
        ],
      },
      {
        code: 'TRN',
        name: 'Transmision',
        level: 1,
        criticality: 'alta',
        description: 'Sistema automatico full-powershift de trabajo y traslado.',
        faults: [
          {
            code: 'TRN-SLIP',
            name: 'Patinamiento',
            severity: 'media',
            symptom: 'Perdida de fuerza o cambios bruscos',
            cause: 'Aceite degradado, presion baja o embragues gastados',
            effect: 'Menor productividad y mayor desgaste',
            recommendedAction: 'Verificar aceite, presion y diagnostico de transmision',
          },
        ],
      },
      {
        code: 'HYD',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Brazos, balde y direccion asistida del equipo.',
        faults: [
          {
            code: 'HYD-PRESSURE',
            name: 'Baja presion hidraulica',
            severity: 'alta',
            symptom: 'Movimiento lento o respuesta irregular',
            cause: 'Fugas, bomba desgastada o filtros obstruidos',
            effect: 'Reduccion de ciclo de carguio',
            recommendedAction: 'Inspeccionar mangueras, bomba y filtros',
          },
        ],
      },
    ],
  },
  {
    brand: 'Caterpillar',
    model: '390F L',
    family: 'Excavadoras y Retroexcavadoras',
    aliases: ['390f l', '390f', 'cat 390f l', 'caterpillar 390f l'],
    sourceUrl: 'https://h-cpc.cat.com/cmms/v2?cid=406&f=product&gid=291&it=product&lid=en&nc=1&pid=18592996&sc=R160',
    sourceLabel: 'Cat 390F L',
    summary: 'Excavadora grande para faenas de movimiento de tierra y produccion de alto tonelaje.',
    keySpecs: [
      { label: 'Potencia neta', value: '391 kW / 524 HP' },
      { label: 'Peso operativo', value: '86.275 - 92.020 kg' },
      { label: 'Motor', value: 'Cat C18 ACERT' },
      { label: 'Caudal principal', value: '952 l/min' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor Cat C18 ACERT de alta demanda para excavacion pesada.',
        faults: [
          {
            code: 'ENG-COOL',
            name: 'Sobrecalentamiento',
            severity: 'alta',
            symptom: 'Alarmas termicas y baja respuesta',
            cause: 'Radiador sucio, flujo reducido o ventilacion deficiente',
            effect: 'Parada por proteccion y riesgo de desgaste acelerado',
            recommendedAction: 'Limpieza de enfriadores, inspeccion de ventilador y nivel de fluidos',
          },
        ],
      },
      {
        code: 'HYD',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Sistema de alta presion para excavacion, giro y desplazamiento.',
        faults: [
          {
            code: 'HYD-LOSS',
            name: 'Perdida de presion',
            severity: 'alta',
            symptom: 'Brazo o giro con respuesta lenta',
            cause: 'Fuga interna, bomba desgastada o valvulas con desgaste',
            effect: 'Caida de productividad y ciclos largos',
            recommendedAction: 'Prueba de presion, revision de mangueras y valvulas',
          },
        ],
      },
      {
        code: 'UND',
        name: 'Undercarriage',
        level: 1,
        criticality: 'media',
        description: 'Tren de rodaje y cadenas del equipo.',
        faults: [
          {
            code: 'UND-WEAR',
            name: 'Desgaste de orugas',
            severity: 'media',
            symptom: 'Vibracion, desviacion o ruido anormal',
            cause: 'Tension incorrecta o abrasividad alta',
            effect: 'Mayor riesgo de detencion y cambio de piezas',
            recommendedAction: 'Ajustar tension, medir desgaste y planificar recambio',
          },
        ],
      },
    ],
  },
  {
    brand: 'Caterpillar',
    model: '324D L',
    family: 'Excavadoras y Retroexcavadoras',
    aliases: ['324d l', '324d', 'cat 324d l', 'caterpillar 324d l'],
    sourceUrl: 'https://h-cpc.cat.com/cmms/v2?cid=406&f=product&gid=329&it=product&lid=es&nc=1&pid=14042644&sc=P420',
    sourceLabel: 'Cat 324D L',
    summary: 'Excavadora mediana para excavacion, carguio y apoyo de terreno en faenas mineras.',
    keySpecs: [
      { label: 'Potencia neta', value: '140 kW / 188 HP' },
      { label: 'Peso operativo', value: '24.790 kg' },
      { label: 'Motor', value: 'Cat C7 ACERT' },
      { label: 'Cilindrada', value: '7.2 L' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor principal del excavador mediano.',
        faults: [
          {
            code: 'ENG-FUEL',
            name: 'Falla de alimentacion',
            severity: 'alta',
            symptom: 'Arranque lento o perdida de fuerza',
            cause: 'Filtro obstruido, bomba defectuosa o aire en linea',
            effect: 'Paradas no programadas y bajo rendimiento',
            recommendedAction: 'Revisar circuito de combustible y presion',
          },
        ],
      },
      {
        code: 'HYD',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Carguio y movimiento de pluma, brazo y balde.',
        faults: [
          {
            code: 'HYD-LEAK',
            name: 'Fuga hidraulica',
            severity: 'media',
            symptom: 'Aceite visible o respuesta baja',
            cause: 'Sello, manguera o racor desgastado',
            effect: 'Baja de presion y riesgo ambiental',
            recommendedAction: 'Aislar la fuga y reemplazar el elemento afectado',
          },
        ],
      },
      {
        code: 'TRK',
        name: 'Tren de rodaje',
        level: 1,
        criticality: 'media',
        description: 'Cadena, rodillos y zapatas de desplazamiento.',
        faults: [
          {
            code: 'TRK-WEAR',
            name: 'Desgaste de tren de rodaje',
            severity: 'media',
            symptom: 'Golpeteo o desviacion de marcha',
            cause: 'Tension deficiente o trabajo en suelo abrasivo',
            effect: 'Costo alto de recambio y detencion',
            recommendedAction: 'Medir desgaste y ajustar plan de recambio',
          },
        ],
      },
    ],
  },
];

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function scoreReference(reference: TechnicalSheetReference, text: string, family: string | null | undefined) {
  const normalizedText = normalizeText(text);
  const normalizedFamily = normalizeText(family);
  let score = 0;

  if (normalizedText.includes(normalizeText(reference.model))) score += 5;
  if (normalizedText.includes(normalizeText(reference.brand))) score += 2;
  if (reference.aliases.some((alias) => normalizedText.includes(normalizeText(alias)))) score += 4;
  if (normalizedFamily && normalizedFamily === normalizeText(reference.family)) score += 3;

  return score;
}

export function resolveTechnicalSheetReference(text: string, family?: string | null) {
  const ranked = TECHNICAL_SHEET_LIBRARY
    .map((reference) => ({ reference, score: scoreReference(reference, text, family) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.reference || null;
}

export function listTechnicalSheetReferences() {
  return TECHNICAL_SHEET_LIBRARY;
}
