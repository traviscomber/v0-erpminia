export async function GET(request: Request) {
  try {
    const mockInsights = {
      equipment_risks: 2,
      expiring_documents: 3,
      critical_stock: 1,
      pending_maintenance: 5,
      overdue_orders: 1,
      operational_efficiency: 87,
    };

    const mockDetails = {
      critical_equipment: [
        {
          id: 'EQ-001',
          name: 'Filtro Vacío 2',
          risk: 'critical',
          issue: 'Vibración anormal detectada',
          action: 'Inspección inmediata requerida',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'EQ-002',
          name: 'Molino SAG',
          risk: 'warning',
          issue: 'Presión por encima de rango normal',
          action: 'Monitoreo continuo',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        },
      ],
      expiring_documents: [
        { id: 'DOC-001', title: 'Certificado de Seguridad', expiresIn: 15 },
        { id: 'DOC-002', title: 'Licencia de Operación', expiresIn: 30 },
        { id: 'DOC-003', title: 'Plan de Emergencia', expiresIn: 7 },
      ],
      critical_stock: [
        { id: 'STK-001', item: 'Repuestos Filtro', level: 'critical', qty: 2 },
      ],
      pending_maintenance: [
        { id: 'MT-001', task: 'Cambio aceite Molino', dueDate: '2024-06-10' },
        { id: 'MT-002', task: 'Inspección Hidrociclones', dueDate: '2024-06-12' },
        { id: 'MT-003', task: 'Calibración sensores', dueDate: '2024-06-15' },
        { id: 'MT-004', task: 'Limpieza filtros', dueDate: '2024-06-18' },
        { id: 'MT-005', task: 'Inspección bombas', dueDate: '2024-06-20' },
      ],
      overdue_orders: [
        { id: 'OC-001', supplier: 'Proveedor C', days: 3 },
      ],
    };

    return Response.json({
      insights: mockInsights,
      details: mockDetails,
      lastAnalysis: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[v0] Error in IA operacional API:', error);
    return Response.json(
      { error: 'Error loading IA insights' },
      { status: 500 }
    );
  }
}
