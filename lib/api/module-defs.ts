import { MODULE_KEYS } from '@/lib/api/module-access';

// Human-readable labels + grouping for the matrix editor UI.
export const MODULE_DEFS = [
  { key: MODULE_KEYS.HSE_KPLS, label: 'KPLS', group: 'HSEC' },
  { key: MODULE_KEYS.HSE_DOCUMENTACION, label: 'Documentación HSE', group: 'HSEC' },
  { key: MODULE_KEYS.HSE_EPP, label: 'EPP', group: 'HSEC' },
  { key: MODULE_KEYS.HSE_INCIDENTE, label: 'Incidentes', group: 'HSEC' },
  { key: MODULE_KEYS.HSE_RIESGOS, label: 'Riesgos', group: 'HSEC' },
  { key: MODULE_KEYS.HSE_INVESTIGACIONES, label: 'Investigaciones', group: 'HSEC' },
  { key: MODULE_KEYS.HSE_CAPACITACIONES, label: 'Capacitaciones', group: 'HSEC' },
  { key: MODULE_KEYS.CONTRATOS_SOLICITAR_LINK, label: 'Solicitar Link', group: 'Contratos' },
  { key: MODULE_KEYS.CONTRATOS_SUBIR_INFO, label: 'Subir Información', group: 'Contratos' },
  { key: MODULE_KEYS.CONTRATOS_APROBAR, label: 'Aprobar Documentación', group: 'Contratos' },
  { key: MODULE_KEYS.CONTRATOS_AUTORIZAR, label: 'Autorizar Empresa', group: 'Contratos' },
  { key: MODULE_KEYS.CONTRATOS_VISUALIZACION, label: 'Visualización', group: 'Contratos' },
];
