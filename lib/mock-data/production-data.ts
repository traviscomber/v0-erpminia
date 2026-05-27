/**
 * Production Mock Data
 * Mock datos para desarrollo y demostración sin dependencias de API
 */

// Equipment Data
export const mockEquipment = [
  {
    id: 'eq-001',
    name: 'Excavadora CAT 390',
    type: 'excavadora',
    status: 'operational',
    availability: 95,
    temperature: 72,
    pressure: 45,
    alarms: 0,
  },
  {
    id: 'eq-002',
    name: 'Motor M-7',
    type: 'motor',
    status: 'warning',
    availability: 88,
    temperature: 85,
    pressure: 52,
    alarms: 1,
  },
  {
    id: 'eq-003',
    name: 'Bomba P-4',
    type: 'bomba',
    status: 'operational',
    availability: 92,
    temperature: 68,
    pressure: 38,
    alarms: 0,
  },
  {
    id: 'eq-004',
    name: 'Compresor C-2',
    type: 'compresor',
    status: 'operational',
    availability: 98,
    temperature: 55,
    pressure: 60,
    alarms: 0,
  },
  {
    id: 'eq-005',
    name: 'Cargador Frontal 966',
    type: 'cargador',
    status: 'operational',
    availability: 91,
    temperature: 70,
    pressure: 42,
    alarms: 0,
  },
];

// Sensor Readings
export const mockSensorReadings = Array.from({ length: 20 }, (_, i) => {
  const now = new Date();
  const timestamp = new Date(now.getTime() - i * 6 * 60000); // Every 6 minutes
  return {
    id: `reading-${i}`,
    timestamp: timestamp.toLocaleTimeString('es-CL'),
    temperature: 70 + Math.random() * 20,
    pressure: 40 + Math.random() * 25,
    vibration: 2 + Math.random() * 5,
  };
}).reverse();

// Active Alarms
export const mockAlarms = [
  {
    id: 'alarm-001',
    severity: 'critical',
    equipment: 'Motor M-7',
    message: 'Temperatura crítica detectada',
    time: '09:15',
    description: 'Temperatura del motor excede 85°C',
  },
  {
    id: 'alarm-002',
    severity: 'warning',
    equipment: 'Excavadora 390',
    message: 'Presión anómala detectada',
    time: '08:42',
    description: 'Presión hidráulica fuera de rango normal',
  },
  {
    id: 'alarm-003',
    severity: 'warning',
    equipment: 'Bomba P-4',
    message: 'Vibración alta detectada',
    time: '08:30',
    description: 'Vibración del equipo aumentó en 15%',
  },
];

// Non-conformances Data
export const mockNonconformances = [
  {
    id: 'nc-001',
    nc_number: 'NC-LAP-20260526-001',
    title: 'Equipo excavadora sin mantenimiento hace 30 días',
    description: 'Motor M-7 requiere mantenimiento preventivo según calendario',
    severity: 'high',
    status: 'open',
    detection_date: '2026-05-20',
    due_date: '2026-05-28',
    identified_by: 'Carlos Mendoza',
    related_process: 'maintenance',
    corrective_actions_count: 1,
    completion_percentage: 25,
  },
  {
    id: 'nc-002',
    nc_number: 'NC-LAP-20260525-002',
    title: 'Falta documentación de inspección HSE',
    description: 'Inspección interna sin registro de conformidad de seguridad',
    severity: 'medium',
    status: 'under_review',
    detection_date: '2026-05-22',
    due_date: '2026-05-30',
    identified_by: 'María García',
    related_process: 'inspection',
    corrective_actions_count: 2,
    completion_percentage: 60,
  },
  {
    id: 'nc-003',
    nc_number: 'NC-LAP-20260524-003',
    title: 'Incumplimiento de rotulación en zona de peligro',
    description: 'Señalética de área restringida no visible en faena norte',
    severity: 'high',
    status: 'corrected',
    detection_date: '2026-05-15',
    due_date: '2026-05-25',
    identified_by: 'Juan López',
    related_process: 'compliance',
    corrective_actions_count: 1,
    completion_percentage: 100,
  },
];

// Corrective Actions Data
export const mockCorrectiveActions = [
  {
    id: 'ca-001',
    action_number: 'CA-NC-LAP-20260526-001-001',
    description: 'Realizar mantenimiento preventivo motor M-7',
    responsible_person: 'Luis Fernández',
    target_completion_date: '2026-05-28',
    status: 'in_progress',
    completion_percentage: 25,
    updates_count: 2,
  },
  {
    id: 'ca-002',
    action_number: 'CA-NC-LAP-20260525-002-001',
    description: 'Completar inspección interna conforme normativa',
    responsible_person: 'Ana Rodríguez',
    target_completion_date: '2026-05-29',
    status: 'in_progress',
    completion_percentage: 60,
    updates_count: 3,
  },
  {
    id: 'ca-003',
    action_number: 'CA-NC-LAP-20260525-002-002',
    description: 'Documentar evidencia de cumplimiento',
    responsible_person: 'Pedro Sánchez',
    target_completion_date: '2026-05-30',
    status: 'planned',
    completion_percentage: 0,
    updates_count: 0,
  },
  {
    id: 'ca-004',
    action_number: 'CA-NC-LAP-20260524-003-001',
    description: 'Reemplazar señalética en área restringida',
    responsible_person: 'Jorge Morales',
    target_completion_date: '2026-05-25',
    status: 'completed',
    completion_percentage: 100,
    updates_count: 4,
  },
];

// Inspections Data
export const mockInspections = [
  {
    id: 'insp-001',
    numero_inspeccion: 'INS-LAP-20260526-001',
    fecha_inspeccion: '2026-05-26',
    tipo_inspeccion: 'interna',
    area_evaluada: 'Zona de Producción A',
    inspector: 'Carlos Mendoza',
    resultado: 'conforme',
    hallazgos: 0,
    no_conformidades: 0,
  },
  {
    id: 'insp-002',
    numero_inspeccion: 'INS-LAP-20260525-002',
    fecha_inspeccion: '2026-05-25',
    tipo_inspeccion: 'externa',
    area_evaluada: 'Zona de Mantenimiento',
    inspector: 'Inspector Externo - SERNAGEOMIN',
    resultado: 'no_conforme',
    hallazgos: 3,
    no_conformidades: 1,
  },
  {
    id: 'insp-003',
    numero_inspeccion: 'INS-LAP-20260524-003',
    fecha_inspeccion: '2026-05-24',
    tipo_inspeccion: 'interna',
    area_evaluada: 'Centro de Operaciones',
    inspector: 'María García',
    resultado: 'conforme',
    hallazgos: 0,
    no_conformidades: 0,
  },
];

// Compliance Data
export const mockComplianceStats = {
  open_nonconformances: 5,
  overdue_nonconformances: 2,
  corrective_actions_in_progress: 8,
  compliance_score: 78,
  on_time_closure_rate: 85,
  pending_approvals: 3,
  last_inspection_date: '2026-05-26',
  next_external_audit: '2026-06-15',
};

// Dashboard KPIs
export const mockDashboardKPIs = {
  operational_equipment: '38/42',
  availability_percentage: 90.5,
  active_alarms: 5,
  production_today: '2,847 t',
  production_target_percentage: 92,
  downtime_accumulated: '145 min',
  downtime_percentage: 3.2,
};

// Shift Information
export const mockShiftInfo = {
  site: 'Faena Mapocho',
  shift_number: 1,
  shift_time: '06:00-14:00',
  personnel_present: '43/45',
  equipment_operational: '18/20',
  production_vs_target: '98%',
  shift_start_time: '2026-05-26T06:00:00Z',
  shift_end_time: '2026-05-26T14:00:00Z',
};

export const getMockProductionData = () => ({
  equipment: mockEquipment,
  sensors: mockSensorReadings,
  readings: mockSensorReadings,
  alarms: mockAlarms,
});

export const getMockNonconformanceData = () => ({
  nonconformances: mockNonconformances,
  corrective_actions: mockCorrectiveActions,
  inspections: mockInspections,
  compliance_stats: mockComplianceStats,
});

export const getMockDashboardData = () => ({
  kpis: mockDashboardKPIs,
  shift_info: mockShiftInfo,
  alarms: mockAlarms,
  inspections: mockInspections,
  nonconformances: mockNonconformances,
});
