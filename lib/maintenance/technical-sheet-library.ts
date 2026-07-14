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
  {
    brand: 'Epiroc',
    model: 'Scooptram ST1030',
    family: 'Cargadores de Bajo Perfil',
    aliases: ['st1030', 'scooptram st1030', 'atlas copco st1030', 'epiroc st1030'],
    sourceUrl: 'https://www.epiroc.com/en-us/products/loaders-and-trucks/diesel-loaders/scooptram-st1030',
    sourceLabel: 'Scooptram ST1030',
    summary: 'Cargador subterraneo de 10 toneladas para operacion minera de mediana escala.',
    keySpecs: [
      { label: 'Capacidad de carga', value: '10 toneladas' },
      { label: 'Aplicacion', value: 'Carga subterranea' },
      { label: 'Enfoque', value: 'Uptime y productividad' },
    ],
    components: [
      {
        code: 'HDL',
        name: 'Sistema de carguio',
        level: 1,
        criticality: 'alta',
        description: 'Balde, brazos y sistema de levantamiento para carga subterranea.',
        faults: [
          {
            code: 'HDL-LEAK',
            name: 'Fuga hidraulica en carguio',
            severity: 'alta',
            symptom: 'Perdida de fuerza o movimiento lento',
            cause: 'Sellos, mangueras o conexiones con desgaste',
            effect: 'Reduccion de rendimiento en carguio',
            recommendedAction: 'Revisar circuito, purgar y reemplazar elementos defectuosos',
          },
        ],
      },
      {
        code: 'DRV',
        name: 'Driveline',
        level: 1,
        criticality: 'alta',
        description: 'Transmision, ejes y acople de arrastre.',
        faults: [
          {
            code: 'DRV-SLIP',
            name: 'Patinamiento de transmision',
            severity: 'media',
            symptom: 'Variacion de velocidad o perdida de traccion',
            cause: 'Aceite degradado o friccion interna',
            effect: 'Mayor desgaste y menor avance',
            recommendedAction: 'Inspeccionar aceite, presion y componentes de friccion',
          },
        ],
      },
      {
        code: 'CAB',
        name: 'Cabina y controles',
        level: 1,
        criticality: 'media',
        description: 'Puesto ergonomico de operador y controles integrados.',
        faults: [
          {
            code: 'CAB-ELECT',
            name: 'Falla de control electrico',
            severity: 'media',
            symptom: 'Intermitencia en mandos o alarma de sistema',
            cause: 'Conexion floja, sensor o modulo defectuoso',
            effect: 'Operacion insegura o incomoda',
            recommendedAction: 'Verificar circuito, conectores y diagnostico de control',
          },
        ],
      },
    ],
  },
  {
    brand: 'Epiroc',
    model: 'Boomer S1D',
    family: 'Equipos de Perforacion',
    aliases: ['boomer s1d', 'boomer s1', 'atlas copco boomer s1d', 'epiroc boomer s1d'],
    sourceUrl: 'https://www.epiroc.com/content/dam/epiroc/underground-mining-and-tunneling/tme/drilling-technical-specifications/boomer/9869_0094_01c_Boomer_S1_technical_specification_english.pdf',
    sourceLabel: 'Boomer S1 technical specification',
    summary: 'Equipo de perforacion frontal de un brazo para galerias pequenas y tuneles de alta precision.',
    keySpecs: [
      { label: 'Seccion de trabajo', value: 'Hasta 33 m2' },
      { label: 'Tipo', value: 'Single-boom face drilling rig' },
      { label: 'Enfoque', value: 'Precision y control' },
    ],
    components: [
      {
        code: 'BOOM',
        name: 'Brazo de perforacion',
        level: 1,
        criticality: 'alta',
        description: 'Brazo telescopico con posicionamiento hidraulico.',
        faults: [
          {
            code: 'BOOM-FREEPLAY',
            name: 'Juego excesivo en brazo',
            severity: 'media',
            symptom: 'Deriva de posicion o imprecision',
            cause: 'Bujes, pines o cilindros con desgaste',
            effect: 'Menor calidad de perforacion',
            recommendedAction: 'Medir holguras y programar recambio de bujes o pines',
          },
        ],
      },
      {
        code: 'DRL',
        name: 'Sistema de perforacion',
        level: 1,
        criticality: 'alta',
        description: 'Martillo, rotacion y avance del equipo.',
        faults: [
          {
            code: 'DRL-LOWP',
            name: 'Baja presion de perforacion',
            severity: 'alta',
            symptom: 'Bajo avance o vibracion anormal',
            cause: 'Falla hidraulica o desgaste de componentes de avance',
            effect: 'Rendimiento bajo y mayor tiempo de ciclo',
            recommendedAction: 'Revisar bomba, presion y circuito de avance',
          },
        ],
      },
      {
        code: 'TRK',
        name: 'Tren de rodaje',
        level: 1,
        criticality: 'media',
        description: 'Desplazamiento del rig en galeria.',
        faults: [
          {
            code: 'TRK-ALIGN',
            name: 'Desalineacion o desgaste',
            severity: 'media',
            symptom: 'Ruido, vibracion o desvio',
            cause: 'Tension incorrecta o terreno abrasivo',
            effect: 'Detencion y mayor desgaste',
            recommendedAction: 'Inspeccionar tension, rodillos y guiado',
          },
        ],
      },
    ],
  },
  {
    brand: 'Caterpillar',
    model: '938H',
    family: 'Cargadores Frontales',
    aliases: ['938h', 'cat 938h', 'caterpillar 938h'],
    sourceUrl: 'https://h-cpc.cat.com/cmms/v2?cid=406&f=product&gid=263&it=product&lid=en&nc=1&pid=17275910&sc=R160',
    sourceLabel: 'Cat 938H',
    summary: 'Cargador frontal mediano para carguio de material, stockpile y soporte operacional.',
    keySpecs: [
      { label: 'Potencia', value: '180 HP' },
      { label: 'Aplicacion', value: 'Material handling y carguio' },
      { label: 'Enfoque', value: 'Breakout force y cycle times' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel del cargador frontal mediano.',
        faults: [
          {
            code: 'ENG-FUEL',
            name: 'Falla de combustible',
            severity: 'media',
            symptom: 'Arranque lento o perdida de potencia',
            cause: 'Filtro tapado, aire en linea o inyeccion sucia',
            effect: 'Menor disponibilidad y potencia',
            recommendedAction: 'Revisar circuito de combustible y calidad de filtros',
          },
        ],
      },
      {
        code: 'HYD',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Levantamiento y basculacion de balde.',
        faults: [
          {
            code: 'HYD-LIFT',
            name: 'Perdida de fuerza de levantamiento',
            severity: 'media',
            symptom: 'Balde lento o poca respuesta',
            cause: 'Bomba gastada o fuga interna',
            effect: 'Ciclos mas largos y menor productividad',
            recommendedAction: 'Inspeccionar presion y componentes hidraulicos',
          },
        ],
      },
      {
        code: 'AXL',
        name: 'Ejes y traccion',
        level: 1,
        criticality: 'media',
        description: 'Sistema de traccion y estabilidad del cargador.',
        faults: [
          {
            code: 'AXL-LOCK',
            name: 'Bloqueo diferencial irregular',
            severity: 'media',
            symptom: 'Deslizamiento o tironeo',
            cause: 'Ajuste o desgaste del sistema de ejes',
            effect: 'Baja capacidad de trabajo en terreno dificil',
            recommendedAction: 'Verificar bloqueos, presion y desgaste',
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
