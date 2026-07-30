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

export const cat938hN1Batch: MaintenanceExpedientRecord[] = [
  {
    id: 'cat938h-2023-03-20-neumatico-pos2',
    source: 'WhatsApp Image 2026-07-29 at 15.07.41 (1).jpeg',
    date: '2023-03-20',
    title: 'Neumático pinchado en posición N°2',
    kind: 'reparacion',
    canonicalSection: 'arbol_fallas',
    summary: 'Se diagnosticó neumático pinchado y se reemplazó la llanta / neumático en la posición N°2.',
    cause: 'Se desarmó la llanta y se detectó pinchazo.',
    solution: 'Cambio de neumático en posición N°2.',
    components: ['neumático', 'llanta'],
    extractedData: {
      asset: 'CAT 938H N°1',
      issue: 'pinchazo',
      position: 2,
    },
  },
  {
    id: 'cat938h-2023-07-28-sobretemperatura',
    source: 'WhatsApp Image 2026-07-29 at 15.07.36.jpeg',
    date: '2023-07-28',
    title: 'Sobretemperatura en interior mina',
    kind: 'reparacion',
    canonicalSection: 'arbol_fallas',
    summary: 'El equipo presentó subida de temperatura en interior mina y se retiró motor para enviar a planta.',
    cause: 'Se rompió la cadena de la bomba de agua.',
    solution: 'Anderson Flores retira motor y lo envía a planta.',
    components: ['cadena de bomba de agua', 'motor', 'bomba de agua'],
    extractedData: {
      asset: 'CAT 938H N°1',
      symptom: 'subida de temperatura',
      action: 'motor enviado a planta',
    },
  },
  {
    id: 'cat938h-2024-07-29-pauta-250h',
    source: 'WhatsApp Image 2026-07-29 at 15.07.42.jpeg',
    date: '2024-07-29',
    title: 'Pauta de mantención 250 hrs',
    kind: 'pauta',
    canonicalSection: 'ot_historica',
    summary: 'Pauta general de mantención con los checks de luces, neumáticos, estructura y cambios de aceite.',
    components: ['aceite de motor', 'filtros', 'neumáticos', 'vidrios de cabina'],
    extractedData: {
      asset: 'CAT 938H N°1',
      maintenance_cycle: '250 hrs',
      horometer: '14.860',
      note: 'vidrios de cabina quebrados',
    },
  },
  {
    id: 'cat938h-2024-07-29-pauta-250h-2',
    source: 'WhatsApp Image 2026-07-29 at 15.07.39 (2).jpeg',
    date: '2024-07-29',
    title: 'Pauta 250 hrs con vidrios quebrados',
    kind: 'pauta',
    canonicalSection: 'ot_historica',
    summary: 'Pauta de inspección con cambios de aceite y observación de vidrios de cabina quebrados.',
    components: ['aceite de motor', 'filtros', 'vidrios de cabina'],
    extractedData: {
      asset: 'CAT 938H N°1',
      maintenance_cycle: '250 hrs',
      note: 'vidrios quebrados',
    },
  },
  {
    id: 'cat938h-2024-12-30-reten-cilindro-volteo',
    source: 'WhatsApp Image 2026-07-29 at 15.07.37.jpeg',
    date: '2024-12-30',
    title: 'Cambio de retén del cilindro de volteo',
    kind: 'reparacion',
    canonicalSection: 'arbol_fallas',
    summary: 'Se realizó reparación hidráulica con cambio de retén del cilindro de volteo.',
    cause: 'Falla en sistema hidráulico.',
    solution: 'Cambio de retén del cilindro de volteo.',
    components: ['retén', 'cilindro de volteo'],
    extractedData: {
      asset: 'CAT 938H-1',
      system: 'hidráulico',
    },
  },
  {
    id: 'cat938h-2024-12-31-flexible-cilindro-levante',
    source: 'WhatsApp Image 2026-07-29 at 15.07.39.jpeg',
    date: '2024-12-31',
    title: 'Cambio de flexible hidráulico',
    kind: 'reparacion',
    canonicalSection: 'arbol_fallas',
    summary: 'Se cambió flexible hidráulico del cilindro de levante.',
    cause: 'Flexible hidráulico con falla.',
    solution: 'Cambio de flexible hidráulico del cilindro de levante.',
    components: ['flexible hidráulico', 'cilindro de levante'],
    extractedData: {
      asset: 'CAT 938H-1',
      system: 'hidráulico',
    },
  },
];

export const cat938hN1BatchSummary = {
  asset: 'CAT 938H N°1',
  location: 'Mina Peumo',
  records: cat938hN1Batch.length,
  categories: {
    ot_historica: cat938hN1Batch.filter((item) => item.canonicalSection === 'ot_historica').length,
    arbol_fallas: cat938hN1Batch.filter((item) => item.canonicalSection === 'arbol_fallas').length,
    componentes: cat938hN1Batch.filter((item) => item.canonicalSection === 'componentes').length,
  },
};
