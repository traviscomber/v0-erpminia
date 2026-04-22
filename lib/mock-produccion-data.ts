// Mock data for Producción and HSE modules
export const mockPlants = [
  { id: '1', name: 'Planta Chancado Primario', location: 'Zona A', status: 'operational' },
  { id: '2', name: 'Planta Concentración', location: 'Zona B', status: 'operational' },
];

export const mockEquipment = [
  { id: 'eq-001', plant_id: '1', name: 'Chancador Primario SAG', type: 'crusher', status: 'operational', availability: 98.5 },
  { id: 'eq-002', plant_id: '1', name: 'Zaranda Vibratoria', type: 'screen', status: 'operational', availability: 95.2 },
  { id: 'eq-003', plant_id: '2', name: 'Molino de Bolas', type: 'mill', status: 'warning', availability: 87.3 },
];

export const mockSensors = [
  { id: 'sen-001', equipment_id: 'eq-001', name: 'Vibración - Motor Principal', unit: 'mm/s', threshold: 10 },
  { id: 'sen-002', equipment_id: 'eq-001', name: 'Temperatura - Cojinete', unit: '°C', threshold: 75 },
  { id: 'sen-003', equipment_id: 'eq-003', name: 'Presión Descarga', unit: 'PSI', threshold: 150 },
];

export const mockIncidents = [
  { id: 'inc-001', equipment_id: 'eq-003', type: 'vibration_high', severity: 'high', status: 'open', date: '2024-04-20' },
  { id: 'inc-002', equipment_id: 'eq-002', type: 'temperature_warning', severity: 'medium', status: 'closed', date: '2024-04-19' },
];
