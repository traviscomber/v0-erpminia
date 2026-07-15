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
    aliases: ['st1030', 'st1000', 'st-1000', 'scooptram st1030', 'scooptram st1000', 'atlas copco st1030', 'atlas copco st1000', 'epiroc st1030', 'epiroc st1000'],
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
    brand: 'Epiroc',
    model: 'Diamec 232',
    family: 'Equipos de Sondaje',
    aliases: ['diamec 232', 'diamec 230', 'diamec 232-2008', 'diamec 232-2012', 'diamec 232 2008', 'diamec 232 2012', 'atlas copco diamec 232', 'diamec 230'],
    sourceUrl: 'https://www.epiroc.com/es-mx/products/drill-rigs/exploration-drill-rigs/core-drilling-rigs/diamec-232',
    sourceLabel: 'Diamec 232',
    summary: 'Sonda subterranea compacta para extraccion de testigos en galerias estrechas y trabajos de exploracion.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Exploracion subterranea' },
      { label: 'Diametro de perforacion', value: 'A' },
      { label: 'Unidad de potencia', value: '15 kW' },
      { label: 'Enfoque', value: 'Montaje rapido y uso en espacios estrechos' },
    ],
    components: [
      {
        code: 'RIG',
        name: 'Unidad de perforacion',
        level: 1,
        criticality: 'alta',
        description: 'Conjunto principal de rotacion y avance para perforacion de testigos.',
        faults: [
          {
            code: 'RIG-DRIVE',
            name: 'Falla de avance',
            severity: 'alta',
            symptom: 'Perdida de avance o atascos durante la perforacion',
            cause: 'Desgaste mecanico, presion deficiente o bloqueo',
            effect: 'Baja de productividad y riesgo de detencion',
            recommendedAction: 'Revisar presion, guias, mandril y sistema mecanico',
          },
        ],
      },
      {
        code: 'HYD',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Bombeo y control hidraulico del rig.',
        faults: [
          {
            code: 'HYD-LOSS',
            name: 'Perdida de presion',
            severity: 'media',
            symptom: 'Funcionamiento lento o irregular',
            cause: 'Fugas, bomba o sellos desgastados',
            effect: 'Menor continuidad operativa',
            recommendedAction: 'Inspeccionar bomba, mangueras y conexiones',
          },
        ],
      },
    ],
  },
  {
    brand: 'Sandvik',
    model: 'DE-130',
    family: 'Equipos de Sondaje',
    aliases: ['de-130', 'de130', 'de130x', 'sandvik de-130', 'sandvik de130x'],
    sourceUrl: 'https://www.rocktechnology.sandvik/en/news-and-media/news-archive/2012/12/sandvik-expands-an-already-successful-product-line-to-include-a-certified-rig-for-high-risk-environments-/',
    sourceLabel: 'Sandvik DE130x',
    summary: 'Sonda de exploracion subterránea para entornos de alto riesgo y perforacion de testigos.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Exploracion subterranea' },
      { label: 'Enfoque', value: 'Certificacion y seguridad' },
      { label: 'Tipo', value: 'Rig de perforacion' },
    ],
    components: [
      {
        code: 'MAST',
        name: 'Mastil y avance',
        level: 1,
        criticality: 'alta',
        description: 'Estructura de avance y posicionamiento de perforacion.',
        faults: [
          {
            code: 'MAST-ALIGN',
            name: 'Desalineacion',
            severity: 'media',
            symptom: 'Perforacion fuera de eje o vibracion',
            cause: 'Desgaste de guias o ajuste incorrecto',
            effect: 'Menor calidad de testigo y avance irregular',
            recommendedAction: 'Calibrar mastil y revisar fijaciones',
          },
        ],
      },
      {
        code: 'CTR',
        name: 'Control y seguridad',
        level: 1,
        criticality: 'alta',
        description: 'Sistema de operacion segura en ambientes exigentes.',
        faults: [
          {
            code: 'CTR-FAULT',
            name: 'Falla de control',
            severity: 'media',
            symptom: 'Intermitencia o alarmas de operacion',
            cause: 'Sensores o cableado defectuoso',
            effect: 'Riesgo operacional y detencion',
            recommendedAction: 'Verificar sensores, panel y cableado',
          },
        ],
      },
    ],
  },
  {
    brand: 'Manitou',
    model: 'MT 732',
    family: 'Manipuladores Telescopicos',
    aliases: ['mt 732', 'mt-732', 'manitou mt 732', 'manitou mlt-x 732', 'mlt-x 732'],
    sourceUrl: 'https://mltx.manitou.com/',
    sourceLabel: 'Manitou MLT-X 732',
    summary: 'Manipulador telescopico de apoyo para carga, izaje y movimiento en faena.',
    keySpecs: [
      { label: 'Capacidad nominal', value: '3.200 kg' },
      { label: 'Altura maxima', value: '6,90 m' },
      { label: 'Potencia motor', value: '70 kW' },
    ],
    components: [
      {
        code: 'ARM',
        name: 'Pluma telescopica',
        level: 1,
        criticality: 'alta',
        description: 'Brazo telescopico principal de elevacion y alcance.',
        faults: [
          {
            code: 'ARM-PLAY',
            name: 'Juego o holgura',
            severity: 'media',
            symptom: 'Movimiento impreciso o vibracion',
            cause: 'Pasadores, bujes o cilindros con desgaste',
            effect: 'Menor precision de maniobra',
            recommendedAction: 'Inspeccionar bujes, pasadores y cilindros',
          },
        ],
      },
      {
        code: 'TRN',
        name: 'Transmision',
        level: 1,
        criticality: 'alta',
        description: 'Sistema de avance y cambio de marchas del telehandler.',
        faults: [
          {
            code: 'TRN-SLIP',
            name: 'Patinamiento',
            severity: 'media',
            symptom: 'Perdida de fuerza o cambios bruscos',
            cause: 'Aceite degradado o desgaste interno',
            effect: 'Menor productividad y riesgo de parada',
            recommendedAction: 'Verificar aceite y diagnostico del sistema',
          },
        ],
      },
    ],
  },
  {
    brand: 'Caterpillar',
    model: '320 GX',
    family: 'Excavadoras y Retroexcavadoras',
    aliases: ['320gx', '320 gx', 'cat 320 gx', 'caterpillar 320 gx', '320-gx'],
    sourceUrl: 'https://www.cat.com/es_MX/products/new/equipment/excavators/medium-excavators/126506.html',
    sourceLabel: 'Cat 320 GX',
    summary: 'Excavadora hidraulica economica con mantenimiento simplificado y eficiencia de combustible.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Excavacion general' },
      { label: 'Enfoque', value: 'Mantenimiento simple y bajo costo' },
      { label: 'Tipo', value: 'Excavadora mediana' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor principal para excavacion y ciclo continuo.',
        faults: [
          {
            code: 'ENG-HEAT',
            name: 'Sobretemperatura',
            severity: 'alta',
            symptom: 'Alarma termica o baja respuesta',
            cause: 'Enfriamiento deficiente o filtros sucios',
            effect: 'Parada preventiva y desgaste acelerado',
            recommendedAction: 'Inspeccionar radiador, filtros y ventilacion',
          },
        ],
      },
      {
        code: 'HYD',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Pluma, brazo, balde y giro del equipo.',
        faults: [
          {
            code: 'HYD-LOSS',
            name: 'Perdida de presion',
            severity: 'media',
            symptom: 'Respuesta lenta o movimientos irregulares',
            cause: 'Fugas o bomba con desgaste',
            effect: 'Baja de rendimiento en ciclo de trabajo',
            recommendedAction: 'Revisar circuito hidraulico y presiones',
          },
        ],
      },
    ],
  },
  {
    brand: 'Caterpillar',
    model: 'CS-533E',
    family: 'Otros Equipos',
    aliases: ['cs-533e', 'cs533e', 'cat cs-533e', 'caterpillar cs-533e'],
    sourceUrl: 'https://h-cpc.cat.com/cmms/v2?cid=406&f=product&gid=290&it=product&lid=en&nc=1&pid=18230166&sc=R160',
    sourceLabel: 'Cat CS-533E',
    summary: 'Compactador vibratorio de suelos para faenas y caminos de servicio.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Compactacion de suelos' },
      { label: 'Potencia bruta', value: '130 hp / 97 kW' },
      { label: 'Peso operativo', value: '10.840 kg' },
    ],
    components: [
      {
        code: 'DRM',
        name: 'Tambor vibratorio',
        level: 1,
        criticality: 'alta',
        description: 'Conjunto de compactacion por vibracion y peso dinamico.',
        faults: [
          {
            code: 'DRM-VIB',
            name: 'Vibracion irregular',
            severity: 'media',
            symptom: 'Compactacion desigual o ruido anormal',
            cause: 'Eccentricos o rodamientos con desgaste',
            effect: 'Menor calidad de compactacion',
            recommendedAction: 'Inspeccionar vibradores y rodamientos',
          },
        ],
      },
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel de traccion y vibracion.',
        faults: [
          {
            code: 'ENG-POWER',
            name: 'Perdida de potencia',
            severity: 'media',
            symptom: 'Menor traccion o velocidad',
            cause: 'Combustible, admision o inyeccion',
            effect: 'Baja productividad y retrasos',
            recommendedAction: 'Revisar sistema de combustible y filtros',
          },
        ],
      },
    ],
  },
  {
    brand: 'JCB',
    model: '533-105',
    family: 'Manipuladores Telescopicos',
    aliases: ['533-105', '533-105t', 'jcb 533-105', 'jcb 533-105t', 'loadall 533-105'],
    sourceUrl: 'https://www.jcb.com/es-CL/products/maquinas/telescopic-handlers/533-105/',
    sourceLabel: 'JCB 533-105',
    summary: 'Manipulador telescopico con largo alcance y uso versatil en faena y apoyo operacional.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Manipulacion y carga' },
      { label: 'Motor', value: 'JCB Dieselmax Stage V' },
      { label: 'Enfoque', value: 'Alcance y maniobrabilidad' },
    ],
    components: [
      {
        code: 'ARM',
        name: 'Pluma y estabilizadores',
        level: 1,
        criticality: 'alta',
        description: 'Sistema telescopico y de apoyo del equipo.',
        faults: [
          {
            code: 'ARM-ALIGN',
            name: 'Desalineacion de pluma',
            severity: 'media',
            symptom: 'Movimiento irregular o perdida de alcance',
            cause: 'Pasadores, bujes o cilindros desgastados',
            effect: 'Menor precision y seguridad',
            recommendedAction: 'Inspeccionar pluma, cilindros y fijaciones',
          },
        ],
      },
      {
        code: 'TRN',
        name: 'Motor y transmision',
        level: 1,
        criticality: 'alta',
        description: 'Traccion y alimentacion del telehandler.',
        faults: [
          {
            code: 'TRN-SLIP',
            name: 'Patinamiento o perdida de fuerza',
            severity: 'media',
            symptom: 'Respuesta lenta o consumo anormal',
            cause: 'Aceite, filtro o desgaste interno',
            effect: 'Menor productividad',
            recommendedAction: 'Revisar aceite, filtros y diagnostico',
          },
        ],
      },
    ],
  },
  {
    brand: 'Hagby',
    model: 'Onram 1000/3',
    family: 'Equipos de Sondaje',
    aliases: ['onram 1000/3', 'onram 1000', 'hagby onram 1000/3', 'hagby onram 1000', '1000/3'],
    sourceUrl: 'https://dasmithdrilling.com/equipment/hagby-onram-10003-msha-permissible-diamond-core-drill',
    sourceLabel: 'Hagby Onram 1000/3',
    summary: 'Equipo de perforacion diamantina compacto para exploracion subterranea y acceso restringido.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Perforacion diamantina' },
      { label: 'Potencia', value: '75 hp' },
      { label: 'Capacidad de tiro', value: '15,000 lbf' },
    ],
    components: [
      {
        code: 'DRL',
        name: 'Cabezal de perforacion',
        level: 1,
        criticality: 'alta',
        description: 'Unidad principal de perforacion y rotacion.',
        faults: [
          {
            code: 'DRL-TORQ',
            name: 'Perdida de torque',
            severity: 'media',
            symptom: 'Menor avance o atascos',
            cause: 'Desgaste mecanico o presion insuficiente',
            effect: 'Baja velocidad de sondaje',
            recommendedAction: 'Revisar sistema hidraulico y cabezal',
          },
        ],
      },
      {
        code: 'PWR',
        name: 'Power pack',
        level: 1,
        criticality: 'alta',
        description: 'Unidad de potencia hidraulica/electrica del rig.',
        faults: [
          {
            code: 'PWR-START',
            name: 'Falla de arranque',
            severity: 'media',
            symptom: 'Equipo no energiza o se apaga',
            cause: 'Bateria, combustible o control',
            effect: 'Detencion operativa',
            recommendedAction: 'Revisar alimentacion, control y baterias',
          },
        ],
      },
    ],
  },
  {
    brand: 'Paus',
    model: 'RL-852',
    family: 'Otros Equipos',
    aliases: ['rl-852', 'rl852', 'paus rl-852', 'paus rl852', 'tsl 2.4'],
    sourceUrl: 'https://www.paus.de/fileadmin/user_upload/Paus/Dokumente/Gebrauchtmaschinen/Berg-und-Tunnelbau/Gebrauchtmaschinen_BBM_RL_852_122021.pdf',
    sourceLabel: 'Paus RL 852 / TSL 2.4',
    summary: 'Scaler subterraneo compacto con martillo hidraulico para saneo y seguridad en mina.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Saneo subterraneo' },
      { label: 'Peso operativo', value: '7.500 kg' },
      { label: 'Motor', value: 'Deutz BF4M 2012C / 75 kW' },
    ],
    components: [
      {
        code: 'BOOM',
        name: 'Pluma telescopica',
        level: 1,
        criticality: 'alta',
        description: 'Brazo de posicionamiento para saneo y limpieza de labores.',
        faults: [
          {
            code: 'BOOM-PLAY',
            name: 'Juego en pluma',
            severity: 'media',
            symptom: 'Golpeteo o perdida de precision',
            cause: 'Pasadores, bujes o cilindros desgastados',
            effect: 'Menor seguridad y calidad de saneo',
            recommendedAction: 'Inspeccionar pluma, cilindros y fijaciones',
          },
        ],
      },
      {
        code: 'HAM',
        name: 'Martillo hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Herramienta principal para saneo de rocas.',
        faults: [
          {
            code: 'HAM-LOSS',
            name: 'Baja energia de impacto',
            severity: 'media',
            symptom: 'Menor capacidad de saneo',
            cause: 'Presion insuficiente o desgaste interno',
            effect: 'Aumento de tiempos y riesgo operacional',
            recommendedAction: 'Verificar presion, sellos y desgaste del martillo',
          },
        ],
      },
    ],
  },
  {
    brand: 'JCB',
    model: '225 NXT',
    family: 'Excavadoras y Retroexcavadoras',
    aliases: ['225', 'jcb 225', 'jcb 225 nxt', '225 nxt', 'jcb 225lc', '225lc'],
    sourceUrl: 'https://www.jcb.com/en-SG/products/machines/tracked-excavators/225-nxt/',
    sourceLabel: 'JCB 225 NXT',
    summary: 'Excavadora de orugas de 22 toneladas para movimiento de tierra, zanjas y apoyo operativo.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Excavacion' },
      { label: 'Peso operativo', value: '22.2 t' },
      { label: 'Enfoque', value: 'Productividad y bajo consumo' },
    ],
    components: [
      {
        code: 'HYD',
        name: 'Sistema hidraulico',
        level: 1,
        criticality: 'alta',
        description: 'Circuito principal de pluma, balde y giro.',
        faults: [
          {
            code: 'HYD-LOSS',
            name: 'Perdida de presion hidraulica',
            severity: 'alta',
            symptom: 'Movimiento lento o irregular',
            cause: 'Fugas, bomba o valvulas',
            effect: 'Menor productividad',
            recommendedAction: 'Prueba de presion y revision de fugas',
          },
        ],
      },
    ],
  },
  {
    brand: 'Mitsubishi Fuso',
    model: 'Canter',
    family: 'Camiones',
    aliases: ['canter', 'mitsubishi canter', 'mitsubishi fuso canter', 'fuso canter', 'fuso 4x4', 'mitsubishi fuso 4x4'],
    sourceUrl: 'https://www.mitsubishi-fuso.com/en/product/fuso-canter/',
    sourceLabel: 'Mitsubishi Fuso Canter',
    summary: 'Camion liviano de apoyo logistico para traslado interno, reparto y operaciones de faena.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Carga liviana' },
      { label: 'Tipo', value: 'Camion liviano' },
      { label: 'Enfoque', value: 'Versatilidad y eficiencia' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Propulsion y alimentacion principal del camion.',
        faults: [
          {
            code: 'ENG-LOSS',
            name: 'Perdida de potencia',
            severity: 'media',
            symptom: 'Respuesta lenta o humo anormal',
            cause: 'Filtros, admision o inyeccion',
            effect: 'Menor capacidad operativa',
            recommendedAction: 'Revisar filtros, admision y sistema de inyeccion',
          },
        ],
      },
    ],
  },
  {
    brand: 'Chevrolet',
    model: 'NKR Euro VI',
    family: 'Camiones',
    aliases: ['nkr', 'nkr 613', 'chevrolet nkr', 'chevrolet nkr 613', 'nkr euro vi', 'nkr 615'],
    sourceUrl: 'https://www.chevrolet.cl/camiones/nkr-camion',
    sourceLabel: 'Chevrolet NKR Euro VI',
    summary: 'Camion liviano para distribucion, apoyo de mantenimiento y logistica de faena.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Transporte liviano' },
      { label: 'Motor', value: 'Isuzu 4JZ1 TCS' },
      { label: 'Enfoque', value: 'Carga urbana y operacional' },
    ],
    components: [
      {
        code: 'CHS',
        name: 'Chasis y suspension',
        level: 1,
        criticality: 'media',
        description: 'Estructura y soporte del vehiculo.',
        faults: [
          {
            code: 'CHS-PLAY',
            name: 'Holgura en suspension',
            severity: 'media',
            symptom: 'Ruidos o inestabilidad',
            cause: 'Bujes, amortiguadores o terminales',
            effect: 'Menor seguridad',
            recommendedAction: 'Inspeccionar suspension y direccion',
          },
        ],
      },
    ],
  },
  {
    brand: 'Ford',
    model: 'Transit',
    family: 'Camionetas',
    aliases: ['transit', 'ford transit', 'transit van', 'ford transit van', 'ford transit passenger van'],
    sourceUrl: 'https://es.ford.com/trucks/transit-passenger-van-wagon/',
    sourceLabel: 'Ford Transit',
    summary: 'Van de apoyo para traslado de personal, herramientas y operaciones livianas.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Transporte de apoyo' },
      { label: 'Tipo', value: 'Van' },
      { label: 'Enfoque', value: 'Capacidad y versatilidad' },
    ],
    components: [
      {
        code: 'BRK',
        name: 'Frenos y suspension',
        level: 1,
        criticality: 'alta',
        description: 'Sistema de frenado y estabilidad del vehiculo.',
        faults: [
          {
            code: 'BRK-FADE',
            name: 'Freno esponjoso',
            severity: 'media',
            symptom: 'Recorrido largo del pedal',
            cause: 'Pastillas, liquido o aire en el circuito',
            effect: 'Riesgo de seguridad',
            recommendedAction: 'Purgar, revisar y reemplazar componentes',
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
  {
    brand: 'FG Wilson',
    model: 'P500-3',
    family: 'Grupos Generadores',
    aliases: ['p500-3', 'fg wilson p500-3', 'wilson 500', 'generador wilson 500 kva'],
    sourceUrl: 'https://www.fgwilson.com/en_GB/products/new/fg-wilson/diesel-generators/medium-range-225-938-kva/1000012492.html',
    sourceLabel: 'FG Wilson P500-3',
    summary: 'Grupo generador diesel de 500 kVA para respaldo y operacion continua en faena.',
    keySpecs: [
      { label: 'Potencia standby', value: '500 kVA / 400 kW' },
      { label: 'Frecuencia', value: '50 Hz' },
      { label: 'Velocidad', value: '1500 RPM' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor principal del grupo generador.',
        faults: [
          {
            code: 'ENG-START',
            name: 'No arranca',
            severity: 'alta',
            symptom: 'El grupo no toma carga o demora en arrancar',
            cause: 'Bateria, combustible o control de arranque',
            effect: 'Perdida de respaldo electrico',
            recommendedAction: 'Revisar baterias, combustible y sistema de control',
          },
        ],
      },
      {
        code: 'ALT',
        name: 'Alternador',
        level: 1,
        criticality: 'alta',
        description: 'Generacion electrica y estabilidad de tension.',
        faults: [
          {
            code: 'ALT-VOLT',
            name: 'Tension inestable',
            severity: 'media',
            symptom: 'Oscilacion de voltaje o frecuencia',
            cause: 'Regulador, conexiones o excitacion',
            effect: 'Riesgo para cargas sensibles',
            recommendedAction: 'Verificar regulador, bornes y protecciones',
          },
        ],
      },
    ],
  },
  {
    brand: 'Atlas Copco',
    model: 'QAS 275',
    family: 'Grupos Generadores',
    aliases: ['qas 275', 'atlas copco qas 275', 'generador qas 275'],
    sourceUrl: 'https://www.atlascopco.com/en-au/construction-equipment/products/power-connect/generators/diesel-generators/qas-275',
    sourceLabel: 'Atlas Copco QAS 275',
    summary: 'Grupo generador diesel de 275 kVA usado para respaldo electrico y faena continua.',
    keySpecs: [
      { label: 'Potencia', value: '275 kVA' },
      { label: 'Tipo', value: 'Diesel generator' },
      { label: 'Enfoque', value: 'Respaldo y continuidad' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel para generacion electrica.',
        faults: [
          {
            code: 'ENG-START',
            name: 'Falla de arranque',
            severity: 'alta',
            symptom: 'El grupo no arranca o se corta',
            cause: 'Bateria, combustible o control',
            effect: 'Sin respaldo electrico',
            recommendedAction: 'Inspeccionar baterias, combustible y control',
          },
        ],
      },
      {
        code: 'CTR',
        name: 'Control y monitoreo',
        level: 1,
        criticality: 'media',
        description: 'Panel de control, alarmas y diagnostico.',
        faults: [
          {
            code: 'CTR-ALRM',
            name: 'Alarmas o lecturas erraticas',
            severity: 'media',
            symptom: 'Lecturas inestables o alarmas inesperadas',
            cause: 'Sensor, cableado o configuracion',
            effect: 'Mala supervision operacional',
            recommendedAction: 'Verificar sensores, cableado y setpoints',
          },
        ],
      },
    ],
  },
  {
    brand: 'Sullair',
    model: '185',
    family: 'Compresores',
    aliases: ['sullair 185', '185 h', '185 series', 'compresor sullair 185'],
    sourceUrl: 'https://america.sullair.com/es/products/compresor-portatil-de-tornillo-rotativo-modelo-185-de-nivel-3-version-internacional',
    sourceLabel: 'Sullair 185',
    summary: 'Compresor portatil de 185 cfm para apoyo de perforacion, limpieza y herramientas neumáticas.',
    keySpecs: [
      { label: 'Caudal', value: '185 cfm / 5.2 m3/min' },
      { label: 'Presion', value: '100 psi / 7 bar' },
      { label: 'Potencia', value: '49 hp / 36.5 kW' },
    ],
    components: [
      {
        code: 'AIR',
        name: 'Sistema de aire',
        level: 1,
        criticality: 'alta',
        description: 'Conjunto de compresion y entrega de aire.',
        faults: [
          {
            code: 'AIR-LOSS',
            name: 'Baja presion o caudal',
            severity: 'alta',
            symptom: 'Caida de presion o salida irregular',
            cause: 'Filtro, fuga o desgaste del air end',
            effect: 'Menor entrega a herramientas y detencion',
            recommendedAction: 'Revisar filtros, fugas y estado del compresor',
          },
        ],
      },
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor de arrastre del compresor.',
        faults: [
          {
            code: 'ENG-HEAT',
            name: 'Sobretemperatura',
            severity: 'media',
            symptom: 'Alarma termica o perdida de potencia',
            cause: 'Radiador, ventilacion o niveles deficientes',
            effect: 'Parada de equipo y riesgo de dano',
            recommendedAction: 'Inspeccionar enfriamiento y niveles',
          },
        ],
      },
    ],
  },
  {
    brand: 'XCMG',
    model: 'XC928',
    family: 'Cargadores Frontales',
    aliases: ['xc928', 'xc928-ev', 'cargador chino xc928', 'xcmg xc928'],
    sourceUrl: 'https://www.xcmg.com/product/pro-detail-137506.htm',
    sourceLabel: 'XCMG XC928-EV',
    summary: 'Cargador frontal asociado a la flota local de apoyo y movimiento de material.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Carguio y movimiento' },
      { label: 'Tipo', value: 'Wheel loader' },
      { label: 'Enfoque', value: 'Carga, maniobra y eficiencia' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Unidad de potencia o traccion del cargador.',
        faults: [
          {
            code: 'ENG-POWER',
            name: 'Perdida de potencia',
            severity: 'media',
            symptom: 'Menor respuesta o ciclos lentos',
            cause: 'Alimentacion, bateria o control',
            effect: 'Menor productividad',
            recommendedAction: 'Revisar sistema de potencia y diagnostico',
          },
        ],
      },
      {
        code: 'BRK',
        name: 'Frenos y transmision',
        level: 1,
        criticality: 'alta',
        description: 'Componentes de avance y detencion del equipo.',
        faults: [
          {
            code: 'BRK-WEAR',
            name: 'Desgaste de frenos o cardanes',
            severity: 'media',
            symptom: 'Ruido, vibracion o respuesta irregular',
            cause: 'Desgaste mecanico o falta de lubricacion',
            effect: 'Riesgo operacional y paro de equipo',
            recommendedAction: 'Inspeccionar frenos, cardanes y lubricacion',
          },
        ],
      },
    ],
  },
  {
    brand: 'FG Wilson',
    model: 'P275-2',
    family: 'Grupos Generadores',
    aliases: ['p275-2', 'p275-5', 'wilson 275', 'generador wilson 275', 'fg wilson 275'],
    sourceUrl: 'https://www.fgwilson.com/en_GB/products/new/fg-wilson/diesel-generators/medium-range-225-938-kva/227227255580579.html',
    sourceLabel: 'FG Wilson P275-2',
    summary: 'Grupo generador diesel de 275 kVA para respaldo y operacion continua.',
    keySpecs: [
      { label: 'Potencia standby', value: '275 kVA / 220 kW' },
      { label: 'Frecuencia', value: '50 Hz' },
      { label: 'Velocidad', value: '1500 RPM' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel del grupo electrico.',
        faults: [
          {
            code: 'ENG-START',
            name: 'No arranca',
            severity: 'alta',
            symptom: 'El grupo no toma carga o demora en arrancar',
            cause: 'Bateria, combustible o control de arranque',
            effect: 'Perdida de respaldo electrico',
            recommendedAction: 'Revisar baterias, combustible y sistema de control',
          },
        ],
      },
      {
        code: 'ALT',
        name: 'Alternador',
        level: 1,
        criticality: 'alta',
        description: 'Salida electrica y estabilidad de tension.',
        faults: [
          {
            code: 'ALT-VOLT',
            name: 'Tension inestable',
            severity: 'media',
            symptom: 'Oscilacion de voltaje o frecuencia',
            cause: 'Regulador, conexiones o excitacion',
            effect: 'Riesgo para cargas sensibles',
            recommendedAction: 'Verificar regulador, bornes y protecciones',
          },
        ],
      },
    ],
  },
  {
    brand: 'Atlas Copco',
    model: 'QAS 500',
    family: 'Grupos Generadores',
    aliases: ['qas 500', 'qas500', 'qas 500 vd', 'atlas copco qas 500', 'generador qas 500'],
    sourceUrl: 'https://www.atlascopco.com/en-us/construction-equipment/pfl-landings/portable-generator',
    sourceLabel: 'Atlas Copco QAS 500',
    summary: 'Grupo generador diesel de 500 kVA para respaldo electrico y faena de alta demanda.',
    keySpecs: [
      { label: 'Potencia', value: '500 kVA' },
      { label: 'Aplicacion', value: 'Respaldo y continuidad' },
      { label: 'Enfoque', value: 'Confiabilidad y eficiencia' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel del grupo electrico.',
        faults: [
          {
            code: 'ENG-START',
            name: 'No arranca',
            severity: 'alta',
            symptom: 'El grupo no toma carga o se corta',
            cause: 'Bateria, combustible o control',
            effect: 'Sin respaldo electrico',
            recommendedAction: 'Revisar baterias, combustible y control',
          },
        ],
      },
      {
        code: 'CTR',
        name: 'Control y monitoreo',
        level: 1,
        criticality: 'media',
        description: 'Panel de control, medicion y alarmas.',
        faults: [
          {
            code: 'CTR-ALRM',
            name: 'Lecturas erraticas',
            severity: 'media',
            symptom: 'Alarmas o mediciones inestables',
            cause: 'Sensor, cableado o configuracion',
            effect: 'Mala supervision operacional',
            recommendedAction: 'Verificar sensores, cableado y setpoints',
          },
        ],
      },
    ],
  },
  {
    brand: 'Sullair',
    model: '375H',
    family: 'Compresores',
    aliases: ['375h', '375 series', 'sullair 375', 'compresor sullair 375'],
    sourceUrl: 'https://america.sullair.com/en/products/375-series-t4f-portable-diesel-compressors',
    sourceLabel: 'Sullair 375H',
    summary: 'Compresor portatil de la familia 375 para trabajos de mayor demanda y presion.',
    keySpecs: [
      { label: 'Caudal', value: '375 - 425 cfm' },
      { label: 'Presion', value: '150 - 200 psi' },
      { label: 'Enfoque', value: 'Servicio pesado y versatilidad' },
    ],
    components: [
      {
        code: 'AIR',
        name: 'Sistema de aire',
        level: 1,
        criticality: 'alta',
        description: 'Compresion y entrega de aire a consumo.',
        faults: [
          {
            code: 'AIR-LOSS',
            name: 'Baja presion o caudal',
            severity: 'alta',
            symptom: 'Caida de presion o salida irregular',
            cause: 'Filtro, fuga o desgaste del air end',
            effect: 'Menor entrega a herramientas y detencion',
            recommendedAction: 'Revisar filtros, fugas y estado del compresor',
          },
        ],
      },
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor de arrastre del compresor.',
        faults: [
          {
            code: 'ENG-HEAT',
            name: 'Sobretemperatura',
            severity: 'media',
            symptom: 'Alarma termica o perdida de potencia',
            cause: 'Radiador, ventilacion o niveles deficientes',
            effect: 'Parada de equipo y riesgo de dano',
            recommendedAction: 'Inspeccionar enfriamiento y niveles',
          },
        ],
      },
    ],
  },
  {
    brand: 'Weichai',
    model: 'WP4.1 33 KVA',
    family: 'Grupos Generadores',
    aliases: ['weichai 33', 'we chai 33', 'weihai 33', 'generador weichai 33 kva'],
    sourceUrl: 'https://en.weichai.com/',
    sourceLabel: 'Weichai Power Generation',
    summary: 'Grupo generador de 33 kVA para respaldo y demanda liviana a media en faena.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Respaldo electrico' },
      { label: 'Tipo', value: 'Generator set' },
      { label: 'Enfoque', value: 'Continuidad y respaldo' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor principal del grupo generador.',
        faults: [
          {
            code: 'ENG-START',
            name: 'Falla de arranque',
            severity: 'alta',
            symptom: 'No parte o parte intermitente',
            cause: 'Bateria, combustible o control',
            effect: 'Perdida de respaldo',
            recommendedAction: 'Revisar baterias, combustible y control',
          },
        ],
      },
      {
        code: 'ALT',
        name: 'Alternador',
        level: 1,
        criticality: 'media',
        description: 'Generacion electrica y estabilidad.',
        faults: [
          {
            code: 'ALT-VOLT',
            name: 'Tension inestable',
            severity: 'media',
            symptom: 'Variacion de voltaje o frecuencia',
            cause: 'Regulador, conexion o excitacion',
            effect: 'Riesgo para cargas sensibles',
            recommendedAction: 'Verificar regulador y bornes',
          },
        ],
      },
    ],
  },
  {
    brand: 'Cummins',
    model: 'C500D5P',
    family: 'Grupos Generadores',
    aliases: ['cummins 500', 'cummins 500 kva', 'c500d5p', 'generador cummins 500 kva'],
    sourceUrl: 'https://www.cummins.com/en-na/generators/products/ci-500d5p',
    sourceLabel: 'Cummins C500D5P',
    summary: 'Grupo generador diesel de 500 kVA para respaldo y operacion continua.',
    keySpecs: [
      { label: 'Potencia', value: '500 kVA' },
      { label: 'Tipo', value: 'Diesel generator set' },
      { label: 'Enfoque', value: 'Respaldo y confiabilidad' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel del grupo electrico.',
        faults: [
          {
            code: 'ENG-START',
            name: 'No arranca',
            severity: 'alta',
            symptom: 'El grupo no toma carga o se corta',
            cause: 'Bateria, combustible o control',
            effect: 'Sin respaldo electrico',
            recommendedAction: 'Revisar baterias, combustible y control',
          },
        ],
      },
      {
        code: 'ALT',
        name: 'Alternador',
        level: 1,
        criticality: 'media',
        description: 'Generacion electrica y estabilidad de tension.',
        faults: [
          {
            code: 'ALT-VOLT',
            name: 'Tension inestable',
            severity: 'media',
            symptom: 'Variacion de voltaje o frecuencia',
            cause: 'Regulador, conexiones o excitacion',
            effect: 'Riesgo para cargas sensibles',
            recommendedAction: 'Verificar regulador y bornes',
          },
        ],
      },
    ],
  },
  {
    brand: 'Positrón',
    model: 'Positron 63 KVA',
    family: 'Grupos Generadores',
    aliases: ['positron 63', 'postron 63', 'gen positron 63 kva', 'generador positron 63 kva'],
    sourceUrl: 'https://www.positron.cl/wp-content/uploads/2018/05/positron-catalogo-de-servicios.pdf',
    sourceLabel: 'Positrón generadores',
    summary: 'Grupo generador de respaldo de menor potencia para faena y servicios auxiliares.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Respaldo electrico' },
      { label: 'Tipo', value: 'Generator set' },
      { label: 'Enfoque', value: 'Continuidad y respaldo' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor del grupo electrico.',
        faults: [
          {
            code: 'ENG-START',
            name: 'Falla de arranque',
            severity: 'alta',
            symptom: 'No parte o parte intermitente',
            cause: 'Bateria, combustible o control',
            effect: 'Perdida de respaldo',
            recommendedAction: 'Revisar baterias, combustible y control',
          },
        ],
      },
      {
        code: 'ALT',
        name: 'Alternador',
        level: 1,
        criticality: 'media',
        description: 'Generacion y estabilidad de salida.',
        faults: [
          {
            code: 'ALT-VOLT',
            name: 'Tension inestable',
            severity: 'media',
            symptom: 'Lecturas o salida inestable',
            cause: 'Regulador, conexion o excitacion',
            effect: 'Riesgo para cargas sensibles',
            recommendedAction: 'Verificar regulador y bornes',
          },
        ],
      },
    ],
  },
  {
    brand: 'Positrón',
    model: 'Positron 150 KVA',
    family: 'Grupos Generadores',
    aliases: ['positron 150', 'gen positron 150 kva', 'generador positron 150 kva'],
    sourceUrl: 'https://www.positron.cl/wp-content/uploads/2018/05/positron-catalogo-de-servicios.pdf',
    sourceLabel: 'Positrón generadores',
    summary: 'Grupo generador de 150 kVA para respaldo y servicios de mayor demanda.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Respaldo electrico' },
      { label: 'Tipo', value: 'Generator set' },
      { label: 'Enfoque', value: 'Continuidad y respaldo' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor del grupo electrico.',
        faults: [
          {
            code: 'ENG-START',
            name: 'Falla de arranque',
            severity: 'alta',
            symptom: 'No parte o parte intermitente',
            cause: 'Bateria, combustible o control',
            effect: 'Perdida de respaldo',
            recommendedAction: 'Revisar baterias, combustible y control',
          },
        ],
      },
      {
        code: 'ALT',
        name: 'Alternador',
        level: 1,
        criticality: 'media',
        description: 'Generacion y estabilidad de salida.',
        faults: [
          {
            code: 'ALT-VOLT',
            name: 'Tension inestable',
            severity: 'media',
            symptom: 'Lecturas o salida inestable',
            cause: 'Regulador, conexion o excitacion',
            effect: 'Riesgo para cargas sensibles',
            recommendedAction: 'Verificar regulador y bornes',
          },
        ],
      },
    ],
  },
  {
    brand: 'Weichai',
    model: 'WP7 165 KVA',
    family: 'Grupos Generadores',
    aliases: ['weichai 165', 'generador weichai 165 kva', 'wp7 165 kva'],
    sourceUrl: 'https://en.weichai.com/',
    sourceLabel: 'Weichai Power Generation',
    summary: 'Grupo generador de 165 kVA para respaldo y demanda media en faena.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Respaldo electrico' },
      { label: 'Tipo', value: 'Generator set' },
      { label: 'Enfoque', value: 'Continuidad y respaldo' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor principal del grupo generador.',
        faults: [
          {
            code: 'ENG-START',
            name: 'Falla de arranque',
            severity: 'alta',
            symptom: 'No parte o parte intermitente',
            cause: 'Bateria, combustible o control',
            effect: 'Perdida de respaldo',
            recommendedAction: 'Revisar baterias, combustible y control',
          },
        ],
      },
      {
        code: 'ALT',
        name: 'Alternador',
        level: 1,
        criticality: 'media',
        description: 'Generacion electrica y estabilidad de salida.',
        faults: [
          {
            code: 'ALT-VOLT',
            name: 'Tension inestable',
            severity: 'media',
            symptom: 'Variacion de voltaje o frecuencia',
            cause: 'Regulador, conexion o excitacion',
            effect: 'Riesgo para cargas sensibles',
            recommendedAction: 'Verificar regulador y bornes',
          },
        ],
      },
    ],
  },
  {
    brand: 'Weichai',
    model: 'WP4.1 70 KVA',
    family: 'Grupos Generadores',
    aliases: ['weichai 70', 'generador weichai 70 kva', 'wp4.1 70 kva'],
    sourceUrl: 'https://en.weichai.com/',
    sourceLabel: 'Weichai Power Generation',
    summary: 'Grupo generador de 70 kVA para respaldo y servicios auxiliares.',
    keySpecs: [
      { label: 'Aplicacion', value: 'Respaldo electrico' },
      { label: 'Tipo', value: 'Generator set' },
      { label: 'Enfoque', value: 'Continuidad y respaldo' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor principal del grupo generador.',
        faults: [
          {
            code: 'ENG-START',
            name: 'Falla de arranque',
            severity: 'alta',
            symptom: 'No parte o parte intermitente',
            cause: 'Bateria, combustible o control',
            effect: 'Perdida de respaldo',
            recommendedAction: 'Revisar baterias, combustible y control',
          },
        ],
      },
      {
        code: 'ALT',
        name: 'Alternador',
        level: 1,
        criticality: 'media',
        description: 'Generacion electrica y estabilidad de salida.',
        faults: [
          {
            code: 'ALT-VOLT',
            name: 'Tension inestable',
            severity: 'media',
            symptom: 'Variacion de voltaje o frecuencia',
            cause: 'Regulador, conexion o excitacion',
            effect: 'Riesgo para cargas sensibles',
            recommendedAction: 'Verificar regulador y bornes',
          },
        ],
      },
    ],
  },
  {
    brand: 'Atlas Copco',
    model: 'QAS 325 VD',
    family: 'Grupos Generadores',
    aliases: ['qas 325', 'qas 325 vd', 'atlas copco qas 325 vd', 'generador qas 325 vd'],
    sourceUrl: 'https://www.atlascopco.com/en-au/construction-equipment/products/power-connect/generators/diesel-generators/qas-275',
    sourceLabel: 'Atlas Copco QAS 325 VD',
    summary: 'Grupo generador diesel de 325 kVA para respaldo electrico y demanda intermedia.',
    keySpecs: [
      { label: 'Potencia', value: '325 kVA' },
      { label: 'Aplicacion', value: 'Respaldo y continuidad' },
      { label: 'Enfoque', value: 'Confiabilidad y eficiencia' },
    ],
    components: [
      {
        code: 'ENG',
        name: 'Motor',
        level: 1,
        criticality: 'alta',
        description: 'Motor diesel del grupo electrico.',
        faults: [
          {
            code: 'ENG-START',
            name: 'No arranca',
            severity: 'alta',
            symptom: 'El grupo no toma carga o se corta',
            cause: 'Bateria, combustible o control',
            effect: 'Sin respaldo electrico',
            recommendedAction: 'Revisar baterias, combustible y control',
          },
        ],
      },
      {
        code: 'CTR',
        name: 'Control y monitoreo',
        level: 1,
        criticality: 'media',
        description: 'Panel de control, medicion y alarmas.',
        faults: [
          {
            code: 'CTR-ALRM',
            name: 'Lecturas erraticas',
            severity: 'media',
            symptom: 'Alarmas o mediciones inestables',
            cause: 'Sensor, cableado o configuracion',
            effect: 'Mala supervision operacional',
            recommendedAction: 'Verificar sensores, cableado y setpoints',
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
