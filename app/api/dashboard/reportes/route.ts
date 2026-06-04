export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'maintenance';
    const dateRange = searchParams.get('range') || 'month';

    // Mock report data
    const reportData = {
      maintenance: {
        title: 'Reporte de Mantención',
        data: [
          { month: 'Ene', completed: 45, pending: 12, overdue: 3 },
          { month: 'Feb', completed: 52, pending: 8, overdue: 2 },
          { month: 'Mar', completed: 48, pending: 10, overdue: 4 },
          { month: 'Abr', completed: 55, pending: 6, overdue: 1 },
          { month: 'May', completed: 58, pending: 5, overdue: 0 },
          { month: 'Jun', completed: 62, pending: 3, overdue: 0 },
        ],
        summary: { total: 320, completed: 320, pending: 44, overdue: 10 },
      },
      production: {
        title: 'Reporte de Producción',
        data: [
          { month: 'Ene', actual: 8500, target: 9000 },
          { month: 'Feb', actual: 8800, target: 9000 },
          { month: 'Mar', actual: 8600, target: 9000 },
          { month: 'Abr', actual: 9100, target: 9000 },
          { month: 'May', actual: 9300, target: 9000 },
          { month: 'Jun', actual: 9500, target: 9000 },
        ],
        summary: { totalProduction: 53800, targetProduction: 54000, efficiency: 99.6 },
      },
      equipment: {
        title: 'Reporte de Equipos',
        data: [
          { equipment: 'Filtro 1', availability: 98.5, MTBF: 1200, MTTR: 2.5 },
          { equipment: 'Filtro 2', availability: 97.2, MTBF: 1100, MTTR: 3 },
          { equipment: 'Hidrociclones', availability: 99.1, MTBF: 1500, MTTR: 1.5 },
        ],
        summary: { avgAvailability: 98.3, avgMTBF: 1266, avgMTTR: 2.3 },
      },
      financial: {
        title: 'Reporte Financiero',
        data: [
          { category: 'Costos', value: 45000000 },
          { category: 'Ingresos', value: 78000000 },
          { category: 'Ganancias', value: 33000000 },
        ],
        summary: { totalCosts: 45000000, totalIncome: 78000000, profit: 33000000 },
      },
      hse: {
        title: 'Reporte HSE',
        data: [
          { month: 'Ene', incidents: 2, nearmiss: 5, audits: 3 },
          { month: 'Feb', incidents: 1, nearmiss: 4, audits: 3 },
          { month: 'Mar', incidents: 0, nearmiss: 3, audits: 4 },
          { month: 'Abr', incidents: 1, nearmiss: 2, audits: 3 },
        ],
        summary: { totalIncidents: 4, totalNearmiss: 14, totalAudits: 13 },
      },
      combined: {
        title: 'Reporte Integrado',
        data: [
          { metric: 'Producción', value: 99.6 },
          { metric: 'Mantenimiento', value: 88.6 },
          { metric: 'Seguridad', value: 95.2 },
          { metric: 'Financiero', value: 92.3 },
        ],
        summary: { overallHealth: 93.9 },
      },
    };

    const selected = reportData[reportType as keyof typeof reportData] || reportData.maintenance;

    return Response.json({
      type: reportType,
      dateRange,
      title: selected.title,
      chartData: selected.data,
      summary: selected.summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[v0] Error in reportes API:', error);
    return Response.json(
      { error: 'Error loading report data' },
      { status: 500 }
    );
  }
}
