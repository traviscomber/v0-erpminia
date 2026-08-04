export type PositronMaintenanceRecord = {
  id: string;
  source: string;
  date: string;
  title: string;
  kind: 'pauta' | 'reparacion';
  canonicalSection: 'ot_historica' | 'arbol_fallas' | 'componentes' | 'ficha_equipo' | 'modificaciones' | 'pendiente_clasificar';
  summary: string;
  cause?: string;
  solution?: string;
  components?: string[];
  extractedData?: Record<string, unknown>;
};

export const positron45_150kvaBatch: PositronMaintenanceRecord[] = [
  {
    id: 'positron-45-2021-09-30-pauta-250h',
    source: 'WhatsApp Image 2026-07-29 at 14.59.34.jpeg',
    date: '2021-09-30',
    title: 'Pauta de mantención 250 hrs',
    kind: 'pauta',
    canonicalSection: 'ot_historica',
    summary: 'Primera pauta visible del generador Positron 150 KVA con horómetro inicial de 15.850 y siguiente mantención en 16.100.',
    extractedData: {
      asset: 'Generador Positron 150 KVA',
      internalNumber: '45',
      horometroInicial: '15850',
      horometroProximaMantencion: '16100',
    },
  },
  {
    id: 'positron-45-2021-10-02-baterias-no-cargan',
    source: 'WhatsApp Image 2026-07-29 at 14.59.35.jpeg',
    date: '2021-10-02',
    title: 'Baterías no cargan',
    kind: 'reparacion',
    canonicalSection: 'arbol_fallas',
    summary: 'El equipo llegó con baterías que no cargaban.',
    cause: 'Baterías con vida útil agotada.',
    solution: 'Se reemplazan 2 baterías 12V 90Ah.',
    components: ['2 baterías 12V 90Ah'],
    extractedData: {
      asset: 'Generador Positron 150 KVA',
      horometro: '16073',
      status: 'operativo',
    },
  },
  {
    id: 'positron-45-2021-11-16-baterias-mal-estado',
    source: 'WhatsApp Image 2026-07-29 at 14.59.35 (1).jpeg',
    date: '2021-11-16',
    title: 'Baterías en mal estado',
    kind: 'reparacion',
    canonicalSection: 'arbol_fallas',
    summary: 'Se reporta fallo de baterías por deterioro y descarga prematura.',
    cause: 'Las baterías cumplen su vida útil.',
    solution: 'Se reemplazan baterías con plomo.',
    components: ['baterías con plomo'],
    extractedData: {
      asset: 'Generador Positron 150 KVA',
      horometro: '16284',
      status: 'operativo',
    },
  },
  {
    id: 'positron-45-2022-04-19-pauta-250h',
    source: 'WhatsApp Image 2026-07-29 at 14.59.53.jpeg',
    date: '2022-04-19',
    title: 'Pauta de mantención 250 hrs',
    kind: 'pauta',
    canonicalSection: 'ot_historica',
    summary: 'Pauta de inspección con horómetro alrededor de 21.250 a 21.500 hrs.',
    extractedData: {
      asset: 'Generador Positron 150 KVA',
      internalNumber: '45',
      note: 'pauta 250 hrs',
    },
  },
  {
    id: 'positron-45-2022-07-18-refrigerante-y-fuga',
    source: 'WhatsApp Image 2026-07-29 at 15.00.01.jpeg',
    date: '2022-07-18',
    title: 'Cambio de refrigerante y eliminación de fuga',
    kind: 'reparacion',
    canonicalSection: 'arbol_fallas',
    summary: 'Se reporta reemplazo de refrigerante y corrección de fuga de combustible.',
    cause: 'Pérdida de refrigerante y fuga de combustible.',
    solution: 'Se cambia refrigerante y se elimina fuga de combustible.',
    components: ['refrigerante', 'línea de combustible'],
    extractedData: {
      asset: 'Generador Positron 150 KVA',
      maintenanceCycle: '250 hrs',
    },
  },
  {
    id: 'positron-45-2023-07-24-mangueras-bomba-agua',
    source: 'WhatsApp Image 2026-07-29 at 15.00.02 (1).jpeg',
    date: '2023-07-24',
    title: 'Cambio de mangueras y bomba de agua',
    kind: 'reparacion',
    canonicalSection: 'arbol_fallas',
    summary: 'Mantenimiento programado con cambio de mangueras de agua, bomba de agua y termocontacto del bearing housing.',
    cause: 'Desgaste de componentes del sistema de refrigeración.',
    solution: 'Se cambian mangueras de agua, bomba de agua y termocontacto.',
    components: ['mangueras de agua', 'bomba de agua', 'termocontacto'],
    extractedData: {
      asset: 'Generador Positron 150 KVA',
      maintenanceCycle: '250 hrs',
    },
  },
  {
    id: 'positron-45-2023-10-26-lavado-enfriadores',
    source: 'WhatsApp Image 2026-07-29 at 15.00.01 (1).jpeg',
    date: '2023-10-26',
    title: 'Lavado de enfriadores',
    kind: 'pauta',
    canonicalSection: 'ot_historica',
    summary: 'Pauta de mantención con lavado de enfriadores y cambio de aceite de motor.',
    components: ['aceite de motor', 'enfriadores'],
    extractedData: {
      asset: 'Generador Positron 150 KVA',
      note: 'se lavan enfriadores',
    },
  },
];

export const positron45_150kvaSummary = {
  asset: 'Generador Positron 45 150 KVA',
  location: 'Mina Peumo',
  records: positron45_150kvaBatch.length,
  categories: {
    ot_historica: positron45_150kvaBatch.filter((item) => item.canonicalSection === 'ot_historica').length,
    arbol_fallas: positron45_150kvaBatch.filter((item) => item.canonicalSection === 'arbol_fallas').length,
    componentes: positron45_150kvaBatch.filter((item) => item.canonicalSection === 'componentes').length,
  },
};
