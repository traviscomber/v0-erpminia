export type MaintenanceExpedientRecord = {
  id: string;
  source: string;
  date: string;
  title: string;
  kind: 'pauta' | 'reparacion' | 'observacion';
  canonicalSection: 'ot_historica' | 'componentes' | 'arbol_fallas' | 'ficha_equipo' | 'modificaciones' | 'pendiente_clasificar';
  summary: string;
  cause?: string;
  solution?: string;
  components?: string[];
  extractedData?: Record<string, unknown>;
};

export const cat938hN2Batch: MaintenanceExpedientRecord[] = [
  {
    id: 'cat938h-n2-2021-05-25-pauta-250h',
    source: 'WhatsApp Image 2026-07-29 at 12.54.25.jpeg',
    date: '2021-05-25',
    title: 'Pauta de mantencion 250 hrs',
    kind: 'pauta',
    canonicalSection: 'ot_historica',
    summary: 'Pauta 250 hrs con chequeo general y cambio de aceite del cargador CAT 938H N2.',
    components: ['aceite de motor', 'filtros', 'neumaticos'],
    extractedData: {
      asset: 'CAT 938H N2',
      maintenance_cycle: '250 hrs',
      horometer_initial: '13500',
      horometer_next: '13750',
      oil_liters: 23,
    },
  },
  {
    id: 'cat938h-n2-2022-02-15-pauta-250h',
    source: 'WhatsApp Image 2026-07-29 at 12.54.25 (1).jpeg',
    date: '2022-02-15',
    title: 'Pauta de mantencion 250 hrs',
    kind: 'pauta',
    canonicalSection: 'ot_historica',
    summary: 'Pauta 250 hrs con cambio de aceite de motor y revisiones generales del equipo.',
    components: ['aceite de motor', 'filtros', 'neumaticos'],
    extractedData: {
      asset: 'CAT 938H N2',
      maintenance_cycle: '250 hrs',
      horometer_initial: '13500',
      horometer_next: '14000',
      oil_liters: 23,
    },
  },
  {
    id: 'cat938h-n2-2022-07-21-pauta-250h',
    source: 'WhatsApp Image 2026-07-29 at 12.54.26 (1).jpeg',
    date: '2022-07-21',
    title: 'Pauta de mantencion 250 hrs',
    kind: 'pauta',
    canonicalSection: 'ot_historica',
    summary: 'Pauta 250 hrs con cambio de aceite de motor y control general de estructura y neumáticos.',
    components: ['aceite de motor', 'filtros', 'neumaticos'],
    extractedData: {
      asset: 'CAT 938H N2',
      maintenance_cycle: '250 hrs',
      horometer_initial: '14250',
      horometer_next: '14500',
      oil_liters: 23,
    },
  },
  {
    id: 'cat938h-n2-2022-03-08-cilindros-levante',
    source: 'WhatsApp Image 2026-07-29 at 12.54.23 (1).jpeg',
    date: '2022-03-08',
    title: 'Cilindros de levante con fuga',
    kind: 'reparacion',
    canonicalSection: 'arbol_fallas',
    summary: 'Se detectaron fugas por tapa de cilindros y se reemplazaron cilindros de levante.',
    cause: 'Sellos malos.',
    solution: 'Se reemplazan 2 cilindros de levante y se realiza diálisis al circuito hidráulico.',
    components: ['cilindros de levante', 'sellos', 'circuito hidraulico'],
    extractedData: {
      asset: 'CAT 938H N2',
      system: 'hidraulico',
      symptom: 'fuga',
    },
  },
  {
    id: 'cat938h-n2-2024-02-23-cilindros-levante',
    source: 'WhatsApp Image 2026-07-29 at 12.54.39.jpeg',
    date: '2024-02-23',
    title: 'Cilindros de levante en mal estado',
    kind: 'reparacion',
    canonicalSection: 'arbol_fallas',
    summary: 'Se reportaron problemas en el sistema de levante y se reemplazaron cilindros defectuosos.',
    cause: 'Cambios en mal estado.',
    solution: 'Cambio de ambos cilindros de levante.',
    components: ['cilindros de levante'],
    extractedData: {
      asset: 'CAT 938H N2',
      system: 'hidraulico',
      symptom: 'problemas en levante',
    },
  },
  {
    id: 'cat938h-n2-2024-03-11-baja-presion-riel',
    source: 'WhatsApp Image 2026-07-29 at 12.54.39 (1).jpeg',
    date: '2024-03-11',
    title: 'Baja presion en riel de combustible',
    kind: 'reparacion',
    canonicalSection: 'arbol_fallas',
    summary: 'Equipo con baja presion en el riel de combustible; se intervino el sistema de inyeccion.',
    cause: 'Baja presion en riel de combustible.',
    solution: 'Cambio de bomba de inyeccion, 6 inyectores, sensor de presion de riel y sensor de presion de bomba.',
    components: ['bomba de inyeccion', 'inyectores', 'sensor de presion de riel', 'sensor de presion de bomba'],
    extractedData: {
      asset: 'CAT 938H N2',
      system: 'combustible',
      injectors: 6,
    },
  },
  {
    id: 'cat938h-n2-2024-05-10-cilindros-levante',
    source: 'WhatsApp Image 2026-07-29 at 12.54.38.jpeg',
    date: '2024-05-10',
    title: 'Cambio de cilindros de levante',
    kind: 'reparacion',
    canonicalSection: 'arbol_fallas',
    summary: 'Se reemplazaron dos cilindros de levante y se realizo diálisis al circuito hidráulico.',
    cause: 'Cilindros en mal estado y fugas.',
    solution: 'Reemplazar 2 cilindros de levante y realizar diálisis al circuito hidráulico.',
    components: ['cilindros de levante', 'circuito hidraulico'],
    extractedData: {
      asset: 'CAT 938H N2',
      system: 'hidraulico',
      symptom: 'fuga',
    },
  },
];

export const cat938hN2BatchSummary = {
  asset: 'CAT 938H N2',
  location: 'Mina Peumo',
  records: cat938hN2Batch.length,
  categories: {
    ot_historica: cat938hN2Batch.filter((item) => item.canonicalSection === 'ot_historica').length,
    arbol_fallas: cat938hN2Batch.filter((item) => item.canonicalSection === 'arbol_fallas').length,
    componentes: cat938hN2Batch.filter((item) => item.canonicalSection === 'componentes').length,
  },
};
