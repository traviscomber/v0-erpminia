export function useProductionData() {
  return {
    equipment: [
      {
        id: 'eq-001',
        name: 'Compresor 1',
        status: 'operational',
        temperature: 65,
        pressure: 8.5,
        vibration: 0.8,
      },
      {
        id: 'eq-002',
        name: 'Bomba Hidráulica',
        status: 'warning',
        temperature: 72,
        pressure: 9.2,
        vibration: 1.2,
      },
      {
        id: 'eq-003',
        name: 'Motor Principal',
        status: 'operational',
        temperature: 58,
        pressure: 8.0,
        vibration: 0.5,
      },
    ],
    readings: [
      {
        timestamp: new Date(Date.now() - 180000).toISOString(),
        temperature: 62,
        pressure: 8.4,
        vibration: 0.7,
      },
      {
        timestamp: new Date(Date.now() - 120000).toISOString(),
        temperature: 64,
        pressure: 8.45,
        vibration: 0.75,
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        temperature: 65,
        pressure: 8.5,
        vibration: 0.8,
      },
      {
        timestamp: new Date().toISOString(),
        temperature: 65.5,
        pressure: 8.52,
        vibration: 0.82,
      },
    ],
  };
}
