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

export type TechnicalSheetPreventiveAlert = {
  code: string;
  componentCode: string;
  componentName: string;
  severity: string;
  priority: string;
  title: string;
  symptom: string;
  cause: string;
  effect: string;
  recommendedAction: string;
  workType: 'preventive';
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
    brand: 'Caterpillar',
    model: '320D L',
    family: 'Excavadoras y Retroexcavadoras',
    aliases: ['320d', '320d l', 'cat 320d', 'caterpillar 320d l'],
    sourceUrl: 'https://h-cpc.cat.com/cmms/v2?cid=406&f=product&gid=329&it=product&lid=nc&nc=1&pid=18341586&sc=R760',
    sourceLabel: 'Cat 320D/320D L',
    summary: 'Excavadora hidraulica de cadena para excavacion, zanjeo y movimiento de material en faena.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Excavacion y zanjeo' },
      { label: 'Enfoque', value: 'Productividad y control' },
      { label: 'Familia', value: 'Excavadoras medianas' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor de trabajo continuo para excavacion y carga.',
        faults: [
          {
            code: 'ENG-COOL',
            name: 'Sobretemperatura',
            severity: 'alta',
            symptom: 'Baja potencia y alarmas termicas',
            cause: 'Radiador sucio o refrigeracion limitada',
            effect: 'Parada de proteccion y desgaste acelerado',
            recommendedAction: 'Limpiar enfriadores y revisar ventilacion',
          },
        ],
      },
      {
        code: 'HYD',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Brazos, giro y movimientos del equipo.',
        faults: [
          {
            code: 'HYD-LOSS',
            name: 'Perdida de presion',
            severity: 'alta',
            symptom: 'Movimiento lento o irregular',
            cause: 'Bomba, fuga interna o valvulas gastadas',
            effect: 'Caida de productividad',
            recommendedAction: 'Prueba de presion y revision de fugas',
          },
        ],
      },
    ],
  },
  {
    brand: 'Caterpillar',
    model: '928G',
    family: 'Cargadores Frontales',
    aliases: ['928g', 'cat 928g', 'caterpillar 928g'],
    sourceUrl: 'https://h-cpc.cat.com/cmms/v2?cid=406&f=product&gid=263&it=product&lid=en&nc=1&pid=753093&sc=US',
    sourceLabel: 'Cat 928G',
    summary: 'Cargador frontal compacto para carguio, soporte de planta y apoyo de material.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Carguio de material' },
      { label: 'Enfoque', value: 'Versatilidad y fiabilidad' },
      { label: 'Familia', value: 'Wheel loader mediano' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel para trabajo continuo.',
        faults: [
          {
            code: 'ENG-POWER',
            name: 'Perdida de potencia',
            severity: 'media',
            symptom: 'Menor fuerza y respuesta lenta',
            cause: 'Filtro, admision o sistema de combustible',
            effect: 'Menor productividad',
            recommendedAction: 'Revisar admision y filtros',
          },
        ],
      },
      {
        code: 'HYD',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Levantamiento y basculacion del balde.',
        faults: [
          {
            code: 'HYD-LIFT',
            name: 'Baja fuerza de levantamiento',
            severity: 'media',
            symptom: 'Ciclos lentos o poca respuesta',
            cause: 'Bomba desgastada o fuga interna',
            effect: 'Mayor tiempo de carga',
            recommendedAction: 'Inspeccionar presion y circuito',
          },
        ],
      },
    ],
  },
  {
    brand: 'Caterpillar',
    model: '950 GC',
    family: 'Cargadores Frontales',
    aliases: ['950gc', '950 gc', 'cat 950 gc', 'caterpillar 950 gc'],
    sourceUrl: 'https://www.cat.com/en_US/products/new/equipment/wheel-loaders/medium-wheel-loaders/1000029532.html',
    sourceLabel: 'Cat 950 GC',
    summary: 'Cargador frontal mediano para material handling, carga a camiones y stockpile.',
    keySpecs: [
      { label: 'Potencia neta', value: '168 kW / 225 HP' },
      { label: 'Peso operativo', value: '18.849 kg' },
      { label: 'Capacidad de balde', value: '2.9 - 4.4 m3' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel de alta disponibilidad.',
        faults: [
          {
            code: 'ENG-FUEL',
            name: 'Falla de alimentacion',
            severity: 'media',
            symptom: 'Arranque lento o perdida de potencia',
            cause: 'Filtro tapado o combustible contaminado',
            effect: 'Menor eficiencia y consumo alto',
            recommendedAction: 'Revisar filtros y calidad de combustible',
          },
        ],
      },
      {
        code: 'HYD',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Balde y circuito de trabajo del cargador.',
        faults: [
          {
            code: 'HYD-LIFT',
            name: 'Baja fuerza de levantamiento',
            severity: 'media',
            symptom: 'Ciclos lentos o poca capacidad de carga',
            cause: 'Bomba o valvula con desgaste',
            effect: 'Menor produccion',
            recommendedAction: 'Medir presion y revisar circuito',
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
    model: 'Scooptram ST1010',
    family: 'Cargadores de Bajo Perfil',
    aliases: ['st1010', 'scooptram st1010', 'atlas copco st1010', 'epiroc st1010'],
    sourceUrl:
      'https://www.epiroc.com/content/dam/epiroc/parts-and-services/service-agreements-and-audits/brochures/9865%200020%2001%20RigScan%20brochure.pdf',
    sourceLabel: 'RigScan brochure Epiroc',
    summary: 'Referencia de cargador subterraneo de 10 toneladas detectado en la base interna de repuestos y catalogo de mantenimiento.',
    keySpecs: [
      { label: 'Capacidad nominal', value: '10 toneladas' },
      { label: 'Aplicacion', value: 'Carga subterranea' },
      { label: 'Enfoque', value: 'Disponibilidad y productividad' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Conjunto motor y alimentacion principal del cargador subterraneo.',
        faults: [
          {
            code: 'ENG-FUEL',
            name: 'Falla de alimentacion',
            severity: 'alta',
            symptom: 'Perdida de potencia, tironeos o arranque lento',
            cause: 'Filtro obstruido, aire en linea o bomba desgastada',
            effect: 'Detencion del equipo y baja de rendimiento',
            recommendedAction: 'Revisar combustible, filtros y presion del circuito',
          },
        ],
      },
      {
        code: 'TRN',
        name: 'Transmision y traccion',
        level: 1,
        criticality: 'alta',
        description: 'Sistema de traccion, caja y acople del equipo.',
        faults: [
          {
            code: 'TRN-SLIP',
            name: 'Patinamiento de transmision',
            severity: 'media',
            symptom: 'Poca fuerza o variacion de velocidad',
            cause: 'Aceite degradado, presion baja o desgaste interno',
            effect: 'Mayor desgaste y menor avance',
            recommendedAction: 'Verificar aceite, presion y diagnostico de transmision',
          },
        ],
      },
      {
        code: 'HID',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Levante, direccion y movimientos de carguio.',
        faults: [
          {
            code: 'HID-LEAK',
            name: 'Perdida de presion hidraulica',
            severity: 'alta',
            symptom: 'Movimiento lento o respuesta irregular',
            cause: 'Mangueras, sellos o bomba con desgaste',
            effect: 'Reduccion de ciclo y riesgo de parada',
            recommendedAction: 'Inspeccionar mangueras, bomba y filtros',
          },
        ],
      },
    ],
  },
  {
    brand: 'Epiroc',
    model: 'Scooptram ST3.5',
    family: 'Cargadores de Bajo Perfil',
    aliases: ['st3.5', 'st3 5', 'scooptram st3.5', 'scooptram st3 5', 'st3,5'],
    sourceUrl: 'https://www.epiroc.com/es-pe/products/loaders-and-trucks/diesel-loaders/scooptram-st3-5',
    sourceLabel: 'Scooptram ST3.5',
    summary: 'Cargador subterraneo diésel de 6 toneladas para labores de carga en galerias pequenas y medianas.',
    keySpecs: [
      { label: 'Capacidad', value: '6 toneladas' },
      { label: 'Aplicacion', value: 'Carga subterranea' },
      { label: 'Enfoque', value: 'Ciclos de carga y maniobrabilidad' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel turboalimentado para operacion subterranea.',
        faults: [
          {
            code: 'ENG-COOL',
            name: 'Sobretemperatura',
            severity: 'alta',
            symptom: 'Alarma termica y perdida de potencia',
            cause: 'Enfriamiento insuficiente o filtros sucios',
            effect: 'Parada preventiva y riesgo de dano mayor',
            recommendedAction: 'Limpiar radiador, revisar ventilacion y niveles',
          },
        ],
      },
      {
        code: 'HID',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Balde, levante y direccion del equipo.',
        faults: [
          {
            code: 'HID-PRESS',
            name: 'Baja presion hidraulica',
            severity: 'media',
            symptom: 'Respuesta lenta o irregular',
            cause: 'Fugas, filtros obstruidos o bomba desgastada',
            effect: 'Menor productividad y ciclos mas largos',
            recommendedAction: 'Verificar circuito, bombas y filtros',
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
    brand: 'Epiroc',
    model: 'Boomer 281',
    family: 'Equipos de Perforacion',
    aliases: ['boomer 281', 'jumbo boomer 281', 'boomer 281-15', 'boomer 281 15'],
    sourceUrl: 'https://www.epiroc.com/es-cl/products/drill-rigs/face-drill-rigs/boomer-281',
    sourceLabel: 'Boomer 281',
    summary: 'Equipo de perforacion frontal hidraulico para mineria y excavacion subterranea de tamanos medianos.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Perforacion frontal' },
      { label: 'Cobertura', value: 'Hasta 48 m2' },
      { label: 'Enfoque', value: 'Seguridad y precision' },
    ],
    components: [
      {
        code: 'BOOM',
        name: 'Brazo de perforacion',
        level: 1,
        criticality: 'alta',
        description: 'Brazo hidraulico robusto para posicionamiento y avance.',
        faults: [
          {
            code: 'BOOM-HOLG',
            name: 'Holgura en brazo',
            severity: 'media',
            symptom: 'Desvio de posicion o precision baja',
            cause: 'Pines, bujes o cilindros con desgaste',
            effect: 'Perforacion imprecisa y menor calidad',
            recommendedAction: 'Medir holguras y programar recambio',
          },
        ],
      },
      {
        code: 'DRL',
        name: 'Sistema de perforacion',
        level: 1,
        criticality: 'alta',
        description: 'Percusion, rotacion y avance del frente.',
        faults: [
          {
            code: 'DRL-LOWP',
            name: 'Baja presion de perforacion',
            severity: 'alta',
            symptom: 'Bajo avance o vibracion anormal',
            cause: 'Bomba o circuito hidraulico con desgaste',
            effect: 'Aumento de tiempo de ciclo',
            recommendedAction: 'Revisar presion, bomba y avances',
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
  {
    brand: 'Caterpillar',
    model: '938G',
    family: 'Cargadores Frontales',
    aliases: ['938g', 'cat 938g', 'caterpillar 938g'],
    sourceUrl: 'https://h-cpc.cat.com/cmms/v2?cid=406&f=product&gid=263&it=product&lid=en&nc=1&pid=752990&sc=M620',
    sourceLabel: 'Cat 938G',
    summary: 'Cargador frontal con foco en breakout force, ciclos rapidos y mantencion simple.',
    keySpecs: [
      { label: 'Potencia neta', value: '119 kW / 160 HP' },
      { label: 'Aplicacion', value: 'Carguio y manipulacion de material' },
      { label: 'Enfoque', value: 'Durabilidad y facilidad de servicio' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel de la serie 938G.',
        faults: [
          {
            code: 'ENG-POWER',
            name: 'Perdida de potencia',
            severity: 'media',
            symptom: 'Menor fuerza y respuesta lenta',
            cause: 'Filtro sucio, inyeccion o admision restringida',
            effect: 'Menor productividad y mayor consumo',
            recommendedAction: 'Inspeccionar admision, filtros y sistema de combustible',
          },
        ],
      },
      {
        code: 'HYD',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Sistema de elevacion y basculacion del balde.',
        faults: [
          {
            code: 'HYD-LIFT',
            name: 'Baja fuerza de levantamiento',
            severity: 'media',
            symptom: 'Ciclos lentos o poca respuesta',
            cause: 'Bomba desgastada o fuga interna',
            effect: 'Mayor tiempo de carga y sobreesfuerzo',
            recommendedAction: 'Medir presion y revisar componentes hidraulicos',
          },
        ],
      },
    ],
  },
  {
    brand: 'Caterpillar',
    model: '246D3',
    family: 'Minicargadores',
    aliases: ['246d3', 'cat 246d3', 'caterpillar 246d3', 'skid steer 246d3'],
    sourceUrl: 'https://www.cat.com/en_GB/products/new/equipment/skid-steer-and-compact-track-loaders/skid-steer-loaders/30056688547513.html',
    sourceLabel: 'Cat 246D3',
    summary: 'Minicargador compacto con levantamiento radial para maniobras, limpieza y apoyo de faena.',
    keySpecs: [
      { label: 'Potencia bruta', value: '55.4 kW / 74.3 HP' },
      { label: 'Capacidad nominal', value: '1000 kg' },
      { label: 'Peso operativo', value: '3392 kg' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor principal del minicargador.',
        faults: [
          {
            code: 'ENG-AIR',
            name: 'Restriccion de admision',
            severity: 'media',
            symptom: 'Baja respuesta o humo anormal',
            cause: 'Filtro de aire o admision obstruida',
            effect: 'Menor traccion y consumo alto',
            recommendedAction: 'Revisar filtros y limpieza de admision',
          },
        ],
      },
      {
        code: 'HID',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Levante, brazo y accionamiento del implemento.',
        faults: [
          {
            code: 'HID-LOSS',
            name: 'Baja presion hidraulica',
            severity: 'alta',
            symptom: 'Brazo lento o respuesta irregular',
            cause: 'Bomba desgastada o fuga interna',
            effect: 'Menor capacidad de trabajo',
            recommendedAction: 'Prueba de presion y revision de mangueras',
          },
        ],
      },
    ],
  },
  {
    brand: 'Atlas Copco',
    model: 'QAS 500',
    family: 'Grupos Generadores',
    aliases: ['qas 500', 'qas500', 'atlas copco qas 500', 'qas 500 kva'],
    sourceUrl: 'https://www.atlascopco.com/en-rs/construction-equipment/products/power-diesel-generators/mobile-europe/qas',
    sourceLabel: 'QAS diesel generators',
    summary: 'Generador diesel portatil de 500 kVA para respaldo y suministro de energia en faena.',
    keySpecs: [
      { label: 'Potencia', value: '500 kVA' },
      { label: 'Aplicacion', value: 'Energizacion de faena' },
      { label: 'Enfoque', value: 'Estabilidad y continuidad' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor generador',
        level: 1,
        criticality: 'alta',
        description: 'Conjunto motor y generador de potencia principal.',
        faults: [
          {
            code: 'ENG-FUEL',
            name: 'Falla de alimentacion',
            severity: 'alta',
            symptom: 'Paradas, baja tension o vibracion',
            cause: 'Filtro, inyeccion o suministro de combustible',
            effect: 'Riesgo de corte de energia',
            recommendedAction: 'Revisar circuito de combustible y diagnostico de motor',
          },
        ],
      },
      {
        code: 'CTRL',
        name: 'Control y proteccion',
        level: 1,
        criticality: 'alta',
        description: 'Tablero, protecciones y regulacion de salida.',
        faults: [
          {
            code: 'CTRL-FAULT',
            name: 'Falla de control',
            severity: 'media',
            symptom: 'Alarmas o salida inestable',
            cause: 'Modulo de control o sensor con error',
            effect: 'Operacion insegura o intermitente',
            recommendedAction: 'Verificar tablero, alarmas y sensores asociados',
          },
        ],
      },
    ],
  },
  {
    brand: 'JCB',
    model: '3CX',
    family: 'Excavadoras y Retroexcavadoras',
    aliases: ['3cx', 'jcb 3cx', 'jcb backhoe 3cx'],
    sourceUrl: 'https://www.jcb.com/en-gb/products/backhoe-loaders/3cx',
    sourceLabel: 'JCB 3CX',
    summary: 'Retroexcavadora para excavacion, carga y apoyo de servicios en faena.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Excavacion y carga' },
      { label: 'Tipo', value: 'Backhoe loader' },
      { label: 'Enfoque', value: 'Versatilidad de uso' },
    ],
    components: [
      {
        code: 'HYD',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Circuito de levantamiento y retroexcavacion.',
        faults: [
          {
            code: 'HYD-LEAK',
            name: 'Fuga hidraulica',
            severity: 'media',
            symptom: 'Respuesta lenta o perdida de fuerza',
            cause: 'Sello, manguera o racor desgastado',
            effect: 'Baja capacidad operacional',
            recommendedAction: 'Revisar fugas y presion',
          },
        ],
      },
    ],
  },
  {
    brand: 'JCB',
    model: '531-70',
    family: 'Manipuladores Telescopicos',
    aliases: ['531-70', 'jcb 531-70', 'telehandler 531-70'],
    sourceUrl: 'https://www.jcb.com/en-gb/products/loadall-telehandlers/531-70',
    sourceLabel: 'JCB 531-70',
    summary: 'Manipulador telescopico para carga, elevacion y apoyo logístico en obra y faena.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Elevacion y carga' },
      { label: 'Tipo', value: 'Telehandler' },
      { label: 'Enfoque', value: 'Alcance y estabilidad' },
    ],
    components: [
      {
        code: 'BOOM',
        name: 'Brazo telescopico',
        level: 1,
        criticality: 'alta',
        description: 'Brazo extensible y mecanismo de izaje.',
        faults: [
          {
            code: 'BOOM-HOLG',
            name: 'Holgura o desalineacion',
            severity: 'media',
            symptom: 'Movimiento impreciso o vibracion',
            cause: 'Pines, bujes o cilindros con desgaste',
            effect: 'Menor seguridad y productividad',
            recommendedAction: 'Inspeccionar holguras y cilindros',
          },
        ],
      },
    ],
  },
  {
    brand: 'JCB',
    model: '455ZX',
    family: 'Cargadores Frontales',
    aliases: ['455zx', 'jcb 455zx', 'wheel loader 455zx'],
    sourceUrl: 'https://www.jcb.com/en-gb/products/wheel-loaders/455zx',
    sourceLabel: 'JCB 455ZX',
    summary: 'Cargador frontal para carguio de material, manejo de stock y apoyo operacional.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Carguio de material' },
      { label: 'Tipo', value: 'Wheel loader' },
      { label: 'Enfoque', value: 'Potencia y control' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel del cargador frontal.',
        faults: [
          {
            code: 'ENG-POWER',
            name: 'Perdida de potencia',
            severity: 'media',
            symptom: 'Respuesta lenta o baja fuerza',
            cause: 'Filtro, admision o combustible',
            effect: 'Menor productividad',
            recommendedAction: 'Revisar filtros y admision',
          },
        ],
      },
    ],
  },
  {
    brand: 'Atlas Copco',
    model: 'XAS 97',
    family: 'Compresores',
    aliases: ['xas97', 'xas 97', 'atlas copco xas 97'],
    sourceUrl: 'https://www.atlascopco.com/en-us/construction-equipment/products/portable-air-compressors/xas-97',
    sourceLabel: 'Atlas Copco XAS 97',
    summary: 'Compresor portatil para suministro de aire en faena, mantenimiento y apoyo operacional.',
    keySpecs: [
      { label: 'Tipo', value: 'Portable air compressor' },
      { label: 'Aplicacion', value: 'Suministro de aire' },
      { label: 'Enfoque', value: 'Disponibilidad y consumo' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor de arrastre del compresor.',
        faults: [
          {
            code: 'ENG-FUEL',
            name: 'Falla de alimentacion',
            severity: 'media',
            symptom: 'Baja respuesta o detencion',
            cause: 'Filtro, combustible o admision',
            effect: 'Menor suministro de aire',
            recommendedAction: 'Revisar filtros y circuito de combustible',
          },
        ],
      },
      {
        code: 'AIR',
        name: 'Sistema de compresion',
        level: 1,
        criticality: 'alta',
        description: 'Cabezal y circuito de aire comprimido.',
        faults: [
          {
            code: 'AIR-LOSS',
            name: 'Baja presion de aire',
            severity: 'alta',
            symptom: 'Salida por debajo de lo esperado',
            cause: 'Fuga, filtro o cabezal desgastado',
            effect: 'Menor capacidad de uso',
            recommendedAction: 'Prueba de presion y revision de fugas',
          },
        ],
      },
    ],
  },
  {
    brand: 'Epiroc',
    model: 'Simba S7',
    family: 'Equipos de Perforacion',
    aliases: ['simba s7', 'simba s7d', 's7d', 'simba', 'jumbo simba'],
    sourceUrl: 'https://www.epiroc.com/en-us/products/drill-rigs/production-drill-rigs/simba-s7',
    sourceLabel: 'Simba S7',
    summary: 'Equipo de perforacion subterranea para produccion, con foco en precision y continuidad operacional.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Perforacion de produccion' },
      { label: 'Tipo', value: 'Long-hole drill rig' },
      { label: 'Enfoque', value: 'Precision y tiempo de ciclo' },
    ],
    components: [
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
            cause: 'Falla hidraulica o desgaste de avance',
            effect: 'Mayor tiempo de ciclo y menor precision',
            recommendedAction: 'Revisar bombas, presion y avance',
          },
        ],
      },
      {
        code: 'BOOM',
        name: 'Brazo y posicionamiento',
        level: 1,
        criticality: 'alta',
        description: 'Brazo, pines y control de posicion.',
        faults: [
          {
            code: 'BOOM-HOLG',
            name: 'Holgura en posicionamiento',
            severity: 'media',
            symptom: 'Deriva o imprecision de perforacion',
            cause: 'Bujes, pines o cilindros gastados',
            effect: 'Perforacion fuera de tolerancia',
            recommendedAction: 'Medir holguras y programar recambio',
          },
        ],
      },
    ],
  },
  {
    brand: 'Epiroc',
    model: 'Simba 1254',
    family: 'Equipos de Perforacion',
    aliases: ['simba 1254', 'simba h1253', 'h1253', 'simba h1254'],
    sourceUrl: 'https://www.epiroc.com/en-us/products/drill-rigs/production-drill-rigs/simba-1254',
    sourceLabel: 'Simba 1254',
    summary: 'Referencia de perforacion subterranea asociada a la familia Simba usada en la base local para componentes y recambios.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Perforacion subterranea' },
      { label: 'Tipo', value: 'Production drill rig' },
      { label: 'Enfoque', value: 'Disponibilidad y control' },
    ],
    components: [
      {
        code: 'DRL',
        name: 'Sistema de perforacion',
        level: 1,
        criticality: 'alta',
        description: 'Conjunto de avance, rotacion y martillo.',
        faults: [
          {
            code: 'DRL-LOWP',
            name: 'Baja presion de perforacion',
            severity: 'alta',
            symptom: 'Avance irregular o lento',
            cause: 'Bomba o circuito con desgaste',
            effect: 'Menor velocidad de perforacion',
            recommendedAction: 'Revisar presion y elementos del circuito',
          },
        ],
      },
      {
        code: 'ELE',
        name: 'Sistema electrico y control',
        level: 1,
        criticality: 'media',
        description: 'Control de mandos, sensores y actuadores.',
        faults: [
          {
            code: 'ELE-COMM',
            name: 'Error de comunicacion',
            severity: 'media',
            symptom: 'Alarmas o mandos intermitentes',
            cause: 'Conexion, modulo o sensor defectuoso',
            effect: 'Paradas intermitentes y diagnósticos recurrentes',
            recommendedAction: 'Inspeccionar conectores y diagnostico',
          },
        ],
      },
    ],
  },
  {
    brand: 'Toyota',
    model: 'Hilux',
    family: 'Camionetas',
    aliases: ['hilux', 'toyota hilux', 'new hilux', 'toyota new hilux'],
    sourceUrl: 'https://www.toyota.com.au/hilux',
    sourceLabel: 'Toyota HiLux',
    summary: 'Camioneta de trabajo para traslado, supervision y soporte operativo en faena.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Traslado y soporte' },
      { label: 'Tipo', value: 'Pickup 4x4' },
      { label: 'Enfoque', value: 'Robustez y mantenimiento simple' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motorizacion de uso mixto en faena y camino.',
        faults: [
          {
            code: 'ENG-FUEL',
            name: 'Falla de alimentacion',
            severity: 'media',
            symptom: 'Perdida de potencia o arranque lento',
            cause: 'Filtro, inyeccion o combustible contaminado',
            effect: 'Menor disponibilidad del vehiculo',
            recommendedAction: 'Revisar filtros y circuito de combustible',
          },
        ],
      },
      {
        code: 'BRK',
        name: 'Frenos y suspension',
        level: 1,
        criticality: 'alta',
        description: 'Sistema de frenado, direccion y estabilidad.',
        faults: [
          {
            code: 'BRK-WEAR',
            name: 'Desgaste de frenos',
            severity: 'media',
            symptom: 'Vibracion o recorrido largo del pedal',
            cause: 'Pastillas, discos o liquido con desgaste',
            effect: 'Riesgo de detencion y seguridad',
            recommendedAction: 'Inspeccionar frenos y programar recambio',
          },
        ],
      },
    ],
  },
  {
    brand: 'Liugong',
    model: 'CPCD25A',
    family: 'Otros Equipos',
    aliases: ['cpcd25a', 'cpcd25', 'liugong cpcd25a', 'grua horquilla liugong'],
    sourceUrl: 'https://www.liugong.com/en/product/cpcd25/index.html',
    sourceLabel: 'Liugong CPCD25',
    summary: 'Grua horquilla diésel para apoyo logístico, movimiento de carga y abastecimiento interno.',
    keySpecs: [
      { label: 'Capacidad nominal', value: '2.5 toneladas' },
      { label: 'Tipo', value: 'Forklift diesel' },
      { label: 'Enfoque', value: 'Maniobrabilidad y continuidad' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diésel de desplazamiento y carga.',
        faults: [
          {
            code: 'ENG-POWER',
            name: 'Perdida de potencia',
            severity: 'media',
            symptom: 'Menor respuesta o humo anormal',
            cause: 'Filtro, admision o combustible deficiente',
            effect: 'Baja eficiencia de maniobra',
            recommendedAction: 'Revisar admision, combustible y filtros',
          },
        ],
      },
      {
        code: 'HID',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Levante de horquillas y mastil.',
        faults: [
          {
            code: 'HID-LEAK',
            name: 'Fuga o baja fuerza de levante',
            severity: 'alta',
            symptom: 'Horquillas lentas o caida de carga',
            cause: 'Sellos, mangueras o bomba desgastada',
            effect: 'Riesgo operacional y menor productividad',
            recommendedAction: 'Inspeccionar circuito y reemplazar elementos',
          },
        ],
      },
    ],
  },
  {
    brand: 'Volkswagen',
    model: 'Amarok',
    family: 'Camionetas',
    aliases: ['amarok', 'vw amarok', 'volkswagen amarok', 'amarok 2024'],
    sourceUrl: 'https://www.volkswagen.com.au/en/models/amarok.html',
    sourceLabel: 'Volkswagen Amarok',
    summary: 'Camioneta 4x4 de soporte operacional para traslado, supervision y apoyo en terreno.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Traslado y soporte' },
      { label: 'Tipo', value: 'Pickup 4x4' },
      { label: 'Enfoque', value: 'Robustez y continuidad' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motorizacion diesel para uso mixto en ruta y faena.',
        faults: [
          {
            code: 'ENG-FUEL',
            name: 'Falla de alimentacion',
            severity: 'media',
            symptom: 'Arranque lento o perdida de potencia',
            cause: 'Filtro, inyeccion o combustible contaminado',
            effect: 'Menor disponibilidad del vehiculo',
            recommendedAction: 'Revisar filtro, presion y circuito de combustible',
          },
        ],
      },
      {
        code: 'BRK',
        name: 'Frenos y suspension',
        level: 1,
        criticality: 'alta',
        description: 'Conjunto de seguridad y estabilidad del vehiculo.',
        faults: [
          {
            code: 'BRK-WEAR',
            name: 'Desgaste de frenos',
            severity: 'media',
            symptom: 'Recorrido largo del pedal o vibracion',
            cause: 'Pastillas, discos o liquido con desgaste',
            effect: 'Riesgo operacional y menor control',
            recommendedAction: 'Inspeccionar frenos y programar recambio',
          },
        ],
      },
    ],
  },
  {
    brand: 'Foton',
    model: 'Auman 3938',
    family: 'Camiones',
    aliases: ['auman 3938', 'foton auman 3938', 'auman', 'tolva 6x4'],
    sourceUrl: 'https://www.fotonmotor.com/',
    sourceLabel: 'Foton Auman',
    summary: 'Camion pesado de trabajo para transporte y tolva, asociado a la flota operativa del repositorio local.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Transporte pesado' },
      { label: 'Tipo', value: 'Camion tolva 6x4' },
      { label: 'Enfoque', value: 'Carga y continuidad' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor de carga para faena y traslado pesado.',
        faults: [
          {
            code: 'ENG-FUEL',
            name: 'Falla de alimentacion',
            severity: 'alta',
            symptom: 'Pausa en aceleracion o humo anormal',
            cause: 'Filtro, inyeccion o suministro deficiente',
            effect: 'Detencion del equipo y perdida de ciclo',
            recommendedAction: 'Revisar circuito de combustible y diagnostico del motor',
          },
        ],
      },
      {
        code: 'TRN',
        name: 'Transmision y tren motriz',
        level: 1,
        criticality: 'alta',
        description: 'Caja, embrague, cardanes y ejes de arrastre.',
        faults: [
          {
            code: 'TRN-SLIP',
            name: 'Patinamiento o cambio brusco',
            severity: 'media',
            symptom: 'Golpes o perdida de arrastre',
            cause: 'Desgaste de embrague, aceite o sincronizacion',
            effect: 'Bajo rendimiento y desgaste acelerado',
            recommendedAction: 'Verificar caja, embrague y aceite',
          },
        ],
      },
    ],
  },
  {
    brand: 'Doosan',
    model: 'P600',
    family: 'Compresores',
    aliases: ['p600', 'doosan p600', 'compresor doosan 600', 'compresor ir doosan 600'],
    sourceUrl: 'https://www.doosanportablepower.com/dpp-mea/mea/en/equipment/air-compressors/medium-air-compressors',
    sourceLabel: 'Doosan P600',
    summary: 'Compresor portatil de alto caudal para apoyo operacional y trabajo continuo en terreno.',
    keySpecs: [
      { label: 'Caudal', value: '17.0 m3/min (600 cfm)' },
      { label: 'Presion', value: '6.9 bar (100 psi)' },
      { label: 'Tipo', value: 'Portable air compressor' },
    ],
    components: [
      {
        code: 'AIR',
        name: 'Sistema de aire',
        level: 1,
        criticality: 'alta',
        description: 'Conjunto de compresion y entrega de aire a consumo.',
        faults: [
          {
            code: 'AIR-LOSS',
            name: 'Baja presion o caudal',
            severity: 'alta',
            symptom: 'Salida de aire irregular o caida de presion',
            cause: 'Fuga, filtro sucio o desgaste interno',
            effect: 'Menor aporte a herramientas y detencion de faena',
            recommendedAction: 'Revisar filtros, fugas y estado del airend',
          },
        ],
      },
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel de arrastre del compresor.',
        faults: [
          {
            code: 'ENG-HEAT',
            name: 'Sobretemperatura',
            severity: 'media',
            symptom: 'Alarma termica o baja respuesta',
            cause: 'Radiador, ventilacion o aceite en mal estado',
            effect: 'Parada de equipo y riesgo de dano',
            recommendedAction: 'Inspeccionar enfriamiento, niveles y limpieza',
          },
        ],
      },
    ],
  },
  {
    brand: 'Mitsubishi',
    model: 'L200',
    family: 'Camionetas',
    aliases: ['l200', 'mitsubishi l200', 'l200 4x4', 'mitsubishi l200 4x4'],
    sourceUrl: 'https://www.mitsubishi-motors.com/en/products/l200/',
    sourceLabel: 'Mitsubishi L200',
    summary: 'Camioneta 4x4 de apoyo operacional y traslado en faena.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Traslado y soporte' },
      { label: 'Tipo', value: 'Pickup 4x4' },
      { label: 'Enfoque', value: 'Robustez y uso mixto' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel de servicio mixto.',
        faults: [
          {
            code: 'ENG-FUEL',
            name: 'Falla de alimentacion',
            severity: 'media',
            symptom: 'Arranque lento o perdida de potencia',
            cause: 'Filtro, inyeccion o combustible contaminado',
            effect: 'Menor disponibilidad del vehiculo',
            recommendedAction: 'Revisar filtro, presion y circuito de combustible',
          },
        ],
      },
      {
        code: 'BRK',
        name: 'Frenos y suspension',
        level: 1,
        criticality: 'alta',
        description: 'Sistema de frenado y estabilidad.',
        faults: [
          {
            code: 'BRK-WEAR',
            name: 'Desgaste de frenos',
            severity: 'media',
            symptom: 'Recorrido largo del pedal o vibracion',
            cause: 'Pastillas, discos o liquido con desgaste',
            effect: 'Riesgo operacional y menor control',
            recommendedAction: 'Inspeccionar frenos y programar recambio',
          },
        ],
      },
    ],
  },
  {
    brand: 'Nissan',
    model: 'Terrano',
    family: 'Camionetas',
    aliases: ['terrano', 'nissan terrano', 'terrano 4x4', 'terrano 2013'],
    sourceUrl: 'https://www.nissan-global.com/EN/PRODUCTS/',
    sourceLabel: 'Nissan Terrano',
    summary: 'Camioneta de apoyo operacional para traslado y supervison.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Traslado y soporte' },
      { label: 'Tipo', value: 'Pickup/SUV 4x4' },
      { label: 'Enfoque', value: 'Durabilidad y control' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motorizacion de servicio mixto.',
        faults: [
          {
            code: 'ENG-POWER',
            name: 'Perdida de potencia',
            severity: 'media',
            symptom: 'Aceleracion lenta o respuesta irregular',
            cause: 'Filtro, inyeccion o sobrecarga',
            effect: 'Menor disponibilidad del vehiculo',
            recommendedAction: 'Diagnosticar circuito de combustible y admision',
          },
        ],
      },
      {
        code: 'BRK',
        name: 'Frenos y direccion',
        level: 1,
        criticality: 'alta',
        description: 'Conjunto de seguridad y maniobra.',
        faults: [
          {
            code: 'BRK-WEAR',
            name: 'Desgaste de frenos',
            severity: 'media',
            symptom: 'Vibracion o recorrido largo del pedal',
            cause: 'Pastillas, discos o liquido con desgaste',
            effect: 'Riesgo de seguridad y detencion',
            recommendedAction: 'Inspeccionar frenos y programar recambio',
          },
        ],
      },
    ],
  },
  {
    brand: 'Volvo',
    model: 'L120F',
    family: 'Cargadores Frontales',
    aliases: ['l120f', 'volvo l120f', 'cargador volvo l120f'],
    sourceUrl: 'https://www.volvoce.com/global/en/products/wheel-loaders/l120f/',
    sourceLabel: 'Volvo L120F',
    summary: 'Cargador frontal de uso pesado para carguio, movimiento y apoyo operacional.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Carguio y movimiento' },
      { label: 'Tipo', value: 'Wheel loader' },
      { label: 'Enfoque', value: 'Fuerza de carguio y control' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel para trabajo continuo.',
        faults: [
          {
            code: 'ENG-HEAT',
            name: 'Sobretemperatura',
            severity: 'alta',
            symptom: 'Alerta termica o perdida de potencia',
            cause: 'Radiador, ventilacion o filtro en mal estado',
            effect: 'Parada de equipo y riesgo de dano',
            recommendedAction: 'Inspeccionar enfriamiento y niveles',
          },
        ],
      },
      {
        code: 'HYD',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Levante, direccion y trabajo del balde.',
        faults: [
          {
            code: 'HYD-LOSS',
            name: 'Baja presion hidraulica',
            severity: 'media',
            symptom: 'Brazo lento o respuesta irregular',
            cause: 'Fuga, bomba o filtro con desgaste',
            effect: 'Menor productividad y ciclos mas largos',
            recommendedAction: 'Revisar circuito hidraulico y bomba',
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

function severityScore(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (['critical', 'critico', 'critica', 'alta', 'high'].includes(normalized)) return 3;
  if (['media', 'medium', 'moderate'].includes(normalized)) return 2;
  return 1;
}

function priorityLabel(score: number) {
  if (score >= 5) return 'Alta';
  if (score >= 3) return 'Media';
  return 'Baja';
}

export function buildReferencePreventiveAlerts(reference: TechnicalSheetReference | null): TechnicalSheetPreventiveAlert[] {
  if (!reference?.components?.length) return [];

  return reference.components
    .flatMap((component) =>
      component.faults.map((fault) => {
        const combinedScore = severityScore(fault.severity) + (normalizeText(component.criticality) === 'alta' ? 2 : 1);
        return {
          code: `${reference.model}-${component.code}-${fault.code}`,
          componentCode: component.code,
          componentName: component.name,
          severity: fault.severity,
          priority: priorityLabel(combinedScore),
          title: `${reference.model}: revisar ${component.name}`,
          symptom: fault.symptom,
          cause: fault.cause,
          effect: fault.effect,
          recommendedAction: fault.recommendedAction,
          workType: 'preventive' as const,
        };
      }),
    )
    .sort((a, b) => {
      const order = { Alta: 3, Media: 2, Baja: 1 } as const;
      return order[b.priority as keyof typeof order] - order[a.priority as keyof typeof order] || a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
    });
}
