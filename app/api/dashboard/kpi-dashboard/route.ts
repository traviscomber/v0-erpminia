export async function GET(request: Request) {
  try {
    const mockKPIs = {
      operating_equipment: 4,
      mtbf_hours: 1250,
      mttr_hours: 2.3,
      availability_percent: 98.5,
      incidents_this_month: 1,
      pending_maintenance: 3,
      stock_turnover: 4.8,
      budget_variance: -2.3,
    };

    const trendData = [
      { month: 'Ene', availability: 96.5, mtbf: 1100, incidents: 4 },
      { month: 'Feb', availability: 97.2, mtbf: 1150, incidents: 3 },
      { month: 'Mar', availability: 97.8, mtbf: 1200, incidents: 2 },
      { month: 'Abr', availability: 98.1, mtbf: 1220, incidents: 2 },
      { month: 'May', availability: 98.3, mtbf: 1240, incidents: 1 },
      { month: 'Jun', availability: 98.5, mtbf: 1250, incidents: 1 },
    ];

    const alertsDistribution = [
      { name: 'Críticos', value: 2, color: '#ef4444' },
      { name: 'Warnings', value: 5, color: '#f97316' },
      { name: 'Info', value: 8, color: '#22c55e' },
    ];

    const recommendations = [
      'Aumentar frecuencia de inspecciones preventivas en Filtro 2',
      'Revisar calibración de sensores de vibración',
      'Implementar programa de rotación de equipos críticos',
      'Actualizar planes de mantenimiento basado en análisis FMEA',
    ];

    return Response.json({
      kpis: mockKPIs,
      trendData,
      alertsDistribution,
      recommendations,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[v0] Error in KPI dashboard API:', error);
    return Response.json(
      { error: 'Error loading KPI data' },
      { status: 500 }
    );
  }
}
