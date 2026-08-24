export type OwnershipEvidence = 'kpi_snapshot' | 'role_matrix' | 'module_specialization';

export type ModuleOwner = {
  moduleKey: string;
  ownerCargo: string;
  evidence: OwnershipEvidence[];
  note?: string;
};

export const MODULE_OWNERSHIP: ModuleOwner[] = [
  { moduleKey: 'prod_operaciones', ownerCargo: 'JEFE PLANTA', evidence: ['kpi_snapshot', 'module_specialization'], note: 'KPIs propios de planta: toneladas tratadas, metalurgia y despacho.' },
  { moduleKey: 'prod_quimica', ownerCargo: 'JEFE PLANTA', evidence: ['role_matrix', 'module_specialization'] },
  { moduleKey: 'prod_geologia', ownerCargo: 'JEFE GEÓLOGIA', evidence: ['kpi_snapshot', 'role_matrix', 'module_specialization'] },
  { moduleKey: 'prod_sondaje', ownerCargo: 'JEFE SONDAJE', evidence: ['kpi_snapshot', 'role_matrix', 'module_specialization'] },
  { moduleKey: 'prod_sondaje_exploracion', ownerCargo: 'JEFE GEOLOGÍA EXPLO.', evidence: ['kpi_snapshot', 'role_matrix', 'module_specialization'] },
  { moduleKey: 'prod_sondaje_produccion', ownerCargo: 'JEFE SONDAJE', evidence: ['kpi_snapshot', 'role_matrix', 'module_specialization'] },
  { moduleKey: 'prod_topografia', ownerCargo: 'JEFE ING. PLA MINA', evidence: ['role_matrix', 'module_specialization'] },
  { moduleKey: 'prod_telemetria', ownerCargo: 'JEFE ADM.', evidence: ['role_matrix'], note: 'Único cargo ED definido actualmente; revisar si cambia la gobernanza operativa.' },

  { moduleKey: 'mant_operaciones', ownerCargo: 'JEFE MAN. EQ', evidence: ['kpi_snapshot', 'module_specialization'], note: 'KPIs propios de mantenimiento: backlog, MTTR y cierre preventivo.' },
  { moduleKey: 'mant_gerencial', ownerCargo: 'JEFE MAN. EQ', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'mant_recursos', ownerCargo: 'JEFE MAN. EQ', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'mant_documentos', ownerCargo: 'JEFE MAN. EQ', evidence: ['role_matrix', 'module_specialization'] },
  { moduleKey: 'mant_activos_estado', ownerCargo: 'JEFE MAN. PLANTA', evidence: ['role_matrix', 'module_specialization'] },
  { moduleKey: 'mant_combustible_mina', ownerCargo: 'JEFE MAN. PLANTA', evidence: ['role_matrix', 'module_specialization'] },
  { moduleKey: 'mant_evaluaciones_personal', ownerCargo: 'JEFE MAN. PLANTA', evidence: ['role_matrix', 'module_specialization'] },
  { moduleKey: 'mant_maestranza', ownerCargo: 'JEFE MAN. PLANTA', evidence: ['role_matrix', 'module_specialization'] },

  { moduleKey: 'bodega_inventario', ownerCargo: 'JEFE BODEGA', evidence: ['kpi_snapshot', 'module_specialization'] },
  { moduleKey: 'bodega_documentos', ownerCargo: 'JEFE BODEGA', evidence: ['kpi_snapshot', 'module_specialization'] },

  { moduleKey: 'fin_compras', ownerCargo: 'JEFE ADM.', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'fin_finanzas', ownerCargo: 'JEFE ADM.', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'fin_reportes', ownerCargo: 'JEFE ADM.', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'core_alertas', ownerCargo: 'JEFE ADM.', evidence: ['role_matrix'] },
  { moduleKey: 'core_centros_costos', ownerCargo: 'JEFE ADM.', evidence: ['kpi_snapshot', 'role_matrix'] },

  { moduleKey: 'legal_modulo', ownerCargo: 'JEFE ADM.', evidence: ['role_matrix', 'module_specialization'] },
  { moduleKey: 'legal_contratos', ownerCargo: 'JEFE ADM.', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'legal_eecc', ownerCargo: 'JEFE ADM.', evidence: ['role_matrix'] },
  { moduleKey: 'contratos_solicitar_link', ownerCargo: 'JEFE ADM.', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'contratos_subir_info', ownerCargo: 'JEFE ADM.', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'contratos_aprobar', ownerCargo: 'JEFE ADM.', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'contratos_autorizar', ownerCargo: 'JEFE ADM.', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'contratos_visualizacion', ownerCargo: 'JEFE ADM.', evidence: ['kpi_snapshot', 'role_matrix'] },

  { moduleKey: 'hse_tablero', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['kpi_snapshot', 'module_specialization'] },
  { moduleKey: 'hse_kpls', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'hse_documentacion', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['kpi_snapshot', 'module_specialization'] },
  { moduleKey: 'hse_documentos_extra', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'hse_epp', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'hse_epp_diagnostico', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'hse_incidente', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['kpi_snapshot', 'module_specialization'] },
  { moduleKey: 'hse_riesgos', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['kpi_snapshot', 'role_matrix'] },
  { moduleKey: 'hse_investigaciones', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['kpi_snapshot', 'module_specialization'] },
  { moduleKey: 'hse_capacitaciones', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['kpi_snapshot', 'module_specialization'] },

  { moduleKey: 'sos_tablero', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['role_matrix', 'module_specialization'] },
  { moduleKey: 'sos_medio_ambiente', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['role_matrix', 'module_specialization'] },
  { moduleKey: 'sos_comunidades', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['role_matrix', 'module_specialization'] },
  { moduleKey: 'sos_documentos', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['role_matrix', 'module_specialization'] },
  { moduleKey: 'sos_calendario', ownerCargo: 'JEFE SOSTENIBILIDAD', evidence: ['role_matrix', 'module_specialization'] },

  { moduleKey: 'rrhh_expediente', ownerCargo: 'JEFE RRHH', evidence: ['module_specialization'], note: 'Cargo canónico existente; actualmente role_matrix no lo refleja como ED.' },
  { moduleKey: 'core_desempeno', ownerCargo: 'GERENTE', evidence: ['role_matrix', 'module_specialization'], note: 'PRESIDENTE conserva ED como nivel de gobierno, no como dueño operativo.' },
];

export function getModuleOwner(moduleKey: string) {
  return MODULE_OWNERSHIP.find((item) => item.moduleKey === moduleKey) || null;
}
