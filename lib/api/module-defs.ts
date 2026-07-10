import { MODULE_KEYS } from '@/lib/api/module-access';

// Human-readable labels + grouping for the matrix editor UI.
export const MODULE_DEFS = [
  // HSEC
  { key: MODULE_KEYS.HSE_TABLERO,         label: 'Tablero HSE',          group: 'HSEC' },
  { key: MODULE_KEYS.HSE_KPLS,            label: 'KPIs Prevención',      group: 'HSEC' },
  { key: MODULE_KEYS.HSE_RIESGOS,         label: 'Prevención de Riesgos',group: 'HSEC' },
  { key: MODULE_KEYS.HSE_INCIDENTE,       label: 'Incidentes',           group: 'HSEC' },
  { key: MODULE_KEYS.HSE_INVESTIGACIONES, label: 'Investigaciones',      group: 'HSEC' },
  { key: MODULE_KEYS.HSE_EPP,             label: 'Artículos EPP',        group: 'HSEC' },
  { key: MODULE_KEYS.HSE_CAPACITACIONES,  label: 'Capacitaciones',       group: 'HSEC' },
  { key: MODULE_KEYS.HSE_DOCUMENTACION,   label: 'Documentos Prevención',group: 'HSEC' },
  { key: MODULE_KEYS.HSE_DOCUMENTOS_EXTRA,label: 'Documentos HSE',       group: 'HSEC' },
  // Sostenibilidad
  { key: MODULE_KEYS.SOS_TABLERO,         label: 'Tablero Sostenibilidad',group: 'Sostenibilidad' },
  { key: MODULE_KEYS.SOS_CALENDARIO,      label: 'Calendario + Inspecciones + Carpeta Arranque', group: 'Sostenibilidad' },
  { key: MODULE_KEYS.SOS_MEDIO_AMBIENTE,  label: 'Medio Ambiente',       group: 'Sostenibilidad' },
  { key: MODULE_KEYS.SOS_COMUNIDADES,     label: 'Comunidades',          group: 'Sostenibilidad' },
  { key: MODULE_KEYS.SOS_DOCUMENTOS,      label: 'Flujo Documental + Reportería', group: 'Sostenibilidad' },
  // Mantenimiento
  { key: MODULE_KEYS.MANT_OPERACIONES,    label: 'Operaciones + CC + Bitácora + OT', group: 'Mantenimiento' },
  { key: MODULE_KEYS.MANT_GERENCIAL,      label: 'Dashboard Gerencial + Indicadores', group: 'Mantenimiento' },
  { key: MODULE_KEYS.MANT_RECURSOS,       label: 'Personal + Combustible + Costos + Neumáticos', group: 'Mantenimiento' },
  { key: MODULE_KEYS.MANT_DOCUMENTOS,     label: 'Documentos + Maquinaria', group: 'Mantenimiento' },
  // Bodega
  { key: MODULE_KEYS.BODEGA_INVENTARIO,   label: 'Bodega e Inventario',  group: 'Bodega' },
  { key: MODULE_KEYS.BODEGA_DOCUMENTOS,   label: 'Documentos Bodega',    group: 'Bodega' },
  // Finanzas
  { key: MODULE_KEYS.FIN_COMPRAS,         label: 'Compras y OCs',        group: 'Finanzas' },
  { key: MODULE_KEYS.FIN_FINANZAS,        label: 'Finanzas y Presupuesto',group: 'Finanzas' },
  { key: MODULE_KEYS.FIN_REPORTES,        label: 'Reportes y Análisis',  group: 'Finanzas' },
  // Legal / Contratos
  { key: MODULE_KEYS.LEGAL_MODULO,        label: 'Módulo Legal',         group: 'Legal' },
  { key: MODULE_KEYS.LEGAL_CONTRATOS,     label: 'Gestión Documental + Contratos', group: 'Legal' },
  { key: MODULE_KEYS.LEGAL_EECC,          label: 'Empresas Contratistas (EECC)', group: 'Legal' },
  // Contratos (acciones del portal)
  { key: MODULE_KEYS.CONTRATOS_SOLICITAR_LINK, label: 'Solicitar Link',   group: 'Contratos' },
  { key: MODULE_KEYS.CONTRATOS_SUBIR_INFO,     label: 'Subir Información',group: 'Contratos' },
  { key: MODULE_KEYS.CONTRATOS_APROBAR,        label: 'Aprobar Documentación', group: 'Contratos' },
  { key: MODULE_KEYS.CONTRATOS_AUTORIZAR,      label: 'Autorizar Empresa',group: 'Contratos' },
  { key: MODULE_KEYS.CONTRATOS_VISUALIZACION,  label: 'Visualización',    group: 'Contratos' },
  // Producción / Core
  { key: MODULE_KEYS.PROD_OPERACIONES,    label: 'Producción',           group: 'Producción' },
  { key: MODULE_KEYS.PROD_TELEMETRIA,     label: 'Telemetría de Sensores',group: 'Producción' },
  { key: MODULE_KEYS.CORE_ALERTAS,        label: 'Alertas',              group: 'Core' },
  { key: MODULE_KEYS.CORE_CENTROS_COSTOS, label: 'Centros de Costos',    group: 'Core' },
];
