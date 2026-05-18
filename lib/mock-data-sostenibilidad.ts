// Mock Data for Sostenibilidad Dashboard - Demo/Development Only

export const mockKPIData = [
  {
    id: '1',
    mes_ano: '2024-05-01',
    tasa_accidentabilidad: 2.5,
    tasa_frecuencia: 1.2,
    tasa_gravedad: 0.8,
    dias_sin_accidentes: 45,
    created_at: '2024-05-01',
  },
  {
    id: '2',
    mes_ano: '2024-04-01',
    tasa_accidentabilidad: 3.1,
    tasa_frecuencia: 1.5,
    tasa_gravedad: 1.0,
    dias_sin_accidentes: 32,
    created_at: '2024-04-01',
  },
  {
    id: '3',
    mes_ano: '2024-03-01',
    tasa_accidentabilidad: 2.8,
    tasa_frecuencia: 1.3,
    tasa_gravedad: 0.9,
    dias_sin_accidentes: 50,
    created_at: '2024-03-01',
  },
];

export const mockCapacitacionesData = [
  {
    id: '1',
    nombre_capacitacion: 'Seguridad en Alturas',
    tipo: 'ACHS' as const,
    tema: 'Prevención de caídas',
    programa_hse: 'Programa Anual 2024',
    proveedor_instructor: 'Juan Pérez López',
    fecha_programada: '2024-05-20',
    duracion_horas: 8,
    faenas_cargos: ['Operario', 'Supervisor'],
    estado: 'realizada' as const,
  },
  {
    id: '2',
    nombre_capacitacion: 'Manejo de Sustancias Químicas',
    tipo: 'OTEC' as const,
    tema: 'Riesgos químicos',
    programa_hse: 'Programa Anual 2024',
    proveedor_instructor: 'Empresa CAPACITEC',
    fecha_programada: '2024-06-10',
    duracion_horas: 6,
    faenas_cargos: ['Técnico', 'Operario'],
    estado: 'planificada' as const,
  },
];

export const mockEPPData = [
  {
    id: '1',
    cargo_puesto: 'Operario',
    elemento_epp: 'Casco de Seguridad',
    cantidad_elemento: 5,
    marca_modelo: 'MSA V-Guard',
    frecuencia_reemplazo: 'anual' as const,
    activo: true,
  },
  {
    id: '2',
    cargo_puesto: 'Operario',
    elemento_epp: 'Guantes de Nitrilo',
    cantidad_elemento: 20,
    marca_modelo: 'Ansell EdgeTek',
    frecuencia_reemplazo: 'mensual' as const,
    activo: true,
  },
  {
    id: '3',
    cargo_puesto: 'Supervisor',
    elemento_epp: 'Chaqueta Reflectante',
    cantidad_elemento: 3,
    marca_modelo: 'SECO',
    frecuencia_reemplazo: 'semestral' as const,
    activo: true,
  },
];

export const mockMedioAmbienteData = [
  {
    id: '1',
    tipo: 'emisiones' as const,
    descripcion: 'Emisiones CO2 - Sector operaciones',
    valor: '45.5',
    unidad: 'kg',
    cumplimiento: 'conforme' as const,
    fecha: '2024-05-18',
  },
  {
    id: '2',
    tipo: 'residuos' as const,
    descripcion: 'Residuos peligrosos recolectados',
    valor: '12.3',
    unidad: 'kg',
    cumplimiento: 'conforme' as const,
    fecha: '2024-05-18',
  },
  {
    id: '3',
    tipo: 'agua' as const,
    descripcion: 'Consumo de agua diario',
    valor: '450',
    unidad: 'L',
    cumplimiento: 'conforme' as const,
    fecha: '2024-05-18',
  },
];

export const mockComunidadesData = [
  {
    id: '1',
    tipo: 'evento' as const,
    descripcion: 'Jornada de limpieza con comunidad La Patagua',
    stakeholder: 'Comunidad La Patagua',
    estado: 'completado' as const,
    fecha: '2024-05-15',
  },
  {
    id: '2',
    tipo: 'comunicacion' as const,
    descripcion: 'Reunión de diálogo sobre impactos ambientales',
    stakeholder: 'Junta de Vecinos',
    estado: 'completado' as const,
    fecha: '2024-05-10',
  },
  {
    id: '3',
    tipo: 'compromiso' as const,
    descripcion: 'Compromiso de reducción de ruido en 15% para 2024',
    stakeholder: 'Municipalidad',
    estado: 'pendiente' as const,
    fecha: '2024-06-01',
  },
];

export const mockCalendarioData = [
  {
    id: '1',
    titulo: 'Inspección Interna Sector Operaciones',
    tipo_evento: 'inspeccion_interna',
    fecha_inicio: '2024-05-25',
    fecha_fin: '2024-05-25',
    ubicacion: 'Sector operaciones',
    descripcion: 'Inspección de seguridad y condiciones de trabajo',
    responsable: 'Carlos Rodríguez',
    estado: 'programado' as const,
  },
  {
    id: '2',
    titulo: 'Capacitación Seguridad en Alturas',
    tipo_evento: 'capacitacion',
    fecha_inicio: '2024-06-01',
    fecha_fin: '2024-06-01',
    ubicacion: 'Sala de capacitación',
    descripcion: 'Capacitación para personal nuevo',
    responsable: 'Juan Pérez',
    estado: 'programado' as const,
  },
  {
    id: '3',
    titulo: 'Auditoría Externa SSO',
    tipo_evento: 'auditoria',
    fecha_inicio: '2024-06-15',
    fecha_fin: '2024-06-16',
    ubicacion: 'Planta general',
    descripcion: 'Auditoría externa por organismo certificador',
    responsable: 'Equipo externo',
    estado: 'programado' as const,
  },
];

export const mockFlujDocumentalData = [
  {
    id: '1',
    documento_nombre: 'Procedimiento de Seguridad en Alturas',
    descripcion: 'Documento que establece el protocolo para trabajos en altura',
    archivo_url: 'https://ejemplo.com/doc-seguridad-alturas.pdf',
    fase_aprobacion: 'pendiente_revision' as const,
    estado: 'en_revision' as const,
    created_at: '2024-05-10',
  },
  {
    id: '2',
    documento_nombre: 'Plan de Respuesta a Emergencias',
    descripcion: 'Plan integral de respuesta ante situaciones de emergencia',
    archivo_url: 'https://ejemplo.com/plan-emergencias.pdf',
    fase_aprobacion: 'jefe_aprobado' as const,
    estado: 'completado' as const,
    created_at: '2024-04-15',
  },
];

export const mockInspeccionesData = [
  {
    id: '1',
    tipo: 'interna' as const,
    titulo: 'Inspección General Planta',
    fecha: '2024-05-18',
    inspector: 'Carlos Rodríguez',
    hallazgos: 4,
    no_conformidades: 1,
    estado: 'completada' as const,
  },
  {
    id: '2',
    tipo: 'externa' as const,
    titulo: 'Auditoría ACHS',
    fecha: '2024-05-12',
    inspector: 'ACHS',
    hallazgos: 2,
    no_conformidades: 0,
    estado: 'completada' as const,
  },
];

// Helper function to add mock data to API responses
export function addMockDataIfEmpty(data: any, mockData: any) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return mockData;
  }
  return data;
}
