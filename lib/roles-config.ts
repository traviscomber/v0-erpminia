// Role-Based Access Control Configuration
// Define what each role can access and perform in the system

export type UserRole = 
  | 'operador_produccion' 
  | 'jefe_mantencion' 
  | 'tecnico_campo' 
  | 'responsable_bodega' 
  | 'oficial_hse' 
  | 'supervisor_gerencia';

export interface RolePermissions {
  name: string;
  icon: string;
  color: string;
  accessibleModules: string[];
  features: string[];
  dashboardWidgets: string[];
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  operador_produccion: {
    name: 'Operador de Producción',
    icon: '⚙️',
    color: 'text-[var(--brand-naranja)]',
    accessibleModules: [
      '/dashboard', // Main dashboard
      '/dashboard/produccion', // Production monitoring
      '/dashboard/alertas', // Alerts
      '/dashboard/hse', // See HSE alerts only
    ],
    features: [
      'Ver sensores en vivo',
      'Detectar anomalías',
      'Reportar fallas',
      'Ver KPIs de equipos',
      'Ver alertas críticas',
      'Notificaciones en tiempo real',
    ],
    dashboardWidgets: [
      'sensores_vivos',
      'alarmas_activas',
      'kpis_produccion',
      'equipos_estado',
      'alertas_criticas',
    ],
  },

  jefe_mantencion: {
    name: 'Jefe de Mantención',
    icon: '👷',
    color: 'text-purple-500',
    accessibleModules: [
      '/dashboard',
      '/dashboard/mantenimiento',
      '/dashboard/work-orders',
      '/dashboard/produccion', // See production to understand issues
      '/dashboard/bodega', // Check available inventory
      '/dashboard/alertas',
      '/dashboard/hse', // See HSE requirements
      '/dashboard/reportes', // View reports
      '/dashboard/documentos-gestion/contratos', // See supplier contracts
    ],
    features: [
      'Crear OT',
      'Asignar OT a técnicos',
      'Ver progreso en vivo',
      'Resolver bloqueos',
      'Analizar MTTR',
      'Ver árbol de fallas',
      'Cierre de OT',
      'Ver disponibilidad de piezas',
      'Consultar histórico',
    ],
    dashboardWidgets: [
      'ot_pendientes',
      'ot_progreso',
      'mttr_metrics',
      'tecnico_asignaciones',
      'inventario_critico',
      'fallos_recurrentes',
    ],
  },

  tecnico_campo: {
    name: 'Técnico de Campo',
    icon: '🔧',
    color: 'text-blue-500',
    accessibleModules: [
      '/dashboard',
      '/dashboard/work-orders',
      '/dashboard/bodega', // Check and consume parts
      '/dashboard/alertas',
    ],
    features: [
      'Recibir OT asignadas',
      'Checklist en móvil',
      'Consumir piezas (QR)',
      'Adjuntar evidencia',
      'Reportar progreso',
      'Cerrar tareas',
      'Ver árbol de fallas',
    ],
    dashboardWidgets: [
      'mis_ot_activas',
      'checklist_pendiente',
      'piezas_consumidas',
      'evidencia_subida',
    ],
  },

  responsable_bodega: {
    name: 'Responsable Bodega',
    icon: '📦',
    color: 'text-[var(--brand-verde)]',
    accessibleModules: [
      '/dashboard',
      '/dashboard/bodega',
      '/dashboard/mantenimiento', // See OT consumption
      '/dashboard/documentos-gestion/adquisiciones', // Manage purchase orders
      '/dashboard/alertas',
    ],
    features: [
      'Recibir materiales',
      'Gestionar stock',
      'Escanear movimientos (QR)',
      'Alertas de stock bajo',
      'Generar reórdenes',
      'Ver reservas de piezas',
      'Auditar consumo',
    ],
    dashboardWidgets: [
      'stock_actual',
      'alertas_stock',
      'movimientos_qr',
      'reservas_pendientes',
      'reordenes_generadas',
    ],
  },

  oficial_hse: {
    name: 'Oficial HSE/Compliance',
    icon: '✅',
    color: 'text-[var(--brand-rojo)]',
    accessibleModules: [
      '/dashboard',
      '/dashboard/hse',
      '/dashboard/mantenimiento', // Audit OT for safety compliance
      '/dashboard/documentos-gestion', // Full document access
      '/dashboard/documentos-gestion/contratos',
      '/dashboard/documentos-gestion/procedimientos',
      '/dashboard/documentos-gestion/seguridad',
      '/dashboard/documentos-gestion/reportes',
      '/dashboard/alertas',
      '/dashboard/reportes',
    ],
    features: [
      'Auditar OT',
      'Ver documentos versionados',
      'Revisar checklists firmados',
      'Reportes de cumplimiento',
      'Matriz de riesgos',
      'Requisitos normativos',
      'Investigación de incidentes',
      'Generar reportes de auditoría',
    ],
    dashboardWidgets: [
      'auditorias_pendientes',
      'incidentes_registrados',
      'requisitos_vencimiento',
      'checklists_firmados',
      'cumplimiento_normativo',
      'matriz_riesgos',
    ],
  },

  supervisor_gerencia: {
    name: 'Supervisor/Gerencia',
    icon: '📊',
    color: 'text-yellow-500',
    accessibleModules: [
      '/dashboard', // Full access to all modules
      '/dashboard/produccion',
      '/dashboard/mantenimiento',
      '/dashboard/bodega',
      '/dashboard/hse',
      '/dashboard/documentos-gestion',
      '/dashboard/documentos-gestion/contratos',
      '/dashboard/documentos-gestion/procedimientos',
      '/dashboard/documentos-gestion/seguridad',
      '/dashboard/documentos-gestion/reportes',
      '/dashboard/alertas',
      '/dashboard/reportes',
      '/dashboard/integracion-completa', // See full integration
      '/dashboard/integracion-arquitectura', // Architecture view
      '/dashboard/work-orders',
      '/dashboard/finanzas',
      '/dashboard/compras',
    ],
    features: [
      'Dashboard de KPIs',
      'Análisis de costos',
      'Tendencias de fallas',
      'ROI preventivo',
      'Ver todo el sistema',
      'Reportes ejecutivos',
      'Análisis de rendimiento',
      'Comparativas por período',
      'Exportar reportes',
    ],
    dashboardWidgets: [
      'kpis_globales',
      'costos_total',
      'mttr_promedio',
      'roi_preventivo',
      'fallos_tendencia',
      'disponibilidad_equipos',
      'costo_por_activo',
      'cumplimiento_hseifen',
    ],
  },
};

// Helper function to get accessible modules for a role
export function getAccessibleModules(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role]?.accessibleModules || [];
}

// Helper function to check if role can access a module
export function canAccessModule(role: UserRole, modulePath: string): boolean {
  const accessibleModules = getAccessibleModules(role);
  return accessibleModules.some(module => modulePath.startsWith(module));
}

// Get role display name
export function getRoleName(role: UserRole): string {
  return ROLE_PERMISSIONS[role]?.name || role;
}

// Get role color for UI
export function getRoleColor(role: UserRole): string {
  return ROLE_PERMISSIONS[role]?.color || 'text-gray-500';
}
