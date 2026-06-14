import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getDashboardSnapshot } from '@/lib/api/dashboard-snapshot';

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'maintenance';
    const dateRange = searchParams.get('range') || 'month';
    const snapshot = await getDashboardSnapshot({
      organizationId: context.organizationId,
      supabase: context.supabase,
    });

    const maintenance = {
      title: 'Reporte de Mantenimiento',
      data: snapshot.trendByMonth.map((item: any) => ({
        month: item.mes,
        completed: snapshot.summary.correctiveOrders,
        pending: snapshot.summary.preventiveOrders,
        overdue: snapshot.summary.overdueWorkOrders,
      })),
      summary: {
        total: snapshot.summary.preventiveOrders + snapshot.summary.correctiveOrders,
        completed: snapshot.summary.correctiveOrders,
        pending: snapshot.summary.preventiveOrders,
        overdue: snapshot.summary.overdueWorkOrders,
      },
    };

    const production = {
      title: 'Reporte de Producción',
      data: snapshot.trendData.map((item: any) => ({
        month: item.date,
        actual: item.equipos,
        target: clamp(item.equipos + 2, 0, 100),
      })),
      summary: {
        totalProduction: snapshot.operationalEquipment,
        targetProduction: snapshot.assets.length,
        efficiency: snapshot.insights.efficiency,
      },
    };

    const equipment = {
      title: 'Reporte de Equipos',
      data: snapshot.assets.slice(0, 5).map((asset: any) => ({
        equipment: asset.name,
        availability: snapshot.operationalEquipment > 0 ? clamp((snapshot.operationalEquipment / snapshot.assets.length) * 100) : 100,
        MTBF: snapshot.mtbfHours,
        MTTR: snapshot.summary.overdueWorkOrders,
      })),
      summary: {
        avgAvailability:
          snapshot.assets.length > 0
            ? Number(((snapshot.operationalEquipment / snapshot.assets.length) * 100).toFixed(1))
            : 100,
        avgMTBF: snapshot.mtbfHours,
        avgMTTR: snapshot.summary.overdueWorkOrders,
      },
    };

    const financial = {
      title: 'Reporte Financiero',
      data: snapshot.costCenters.slice(0, 5).map((center: any) => ({
        category: center.name,
        value: Number(center.budget_used || 0),
      })),
      summary: {
        totalCosts: snapshot.costCenters.reduce((sum: number, center: any) => sum + Number(center.budget_used || 0), 0),
        totalIncome: snapshot.costCenters.reduce((sum: number, center: any) => sum + Number(center.budget_annual || 0), 0),
        profit: snapshot.costCenters.reduce(
          (sum: number, center: any) => sum + Number(center.budget_annual || 0) - Number(center.budget_used || 0),
          0
        ),
      },
    };

    const hse = {
      title: 'Reporte HSE',
      data: snapshot.recommendations.slice(0, 4).map((item: any, index: number) => ({
        month: `M${index + 1}`,
        incidents: item.severity === 'critical' ? 1 : 0,
        nearmiss: item.severity === 'warning' ? 1 : 0,
        audits: 1,
      })),
      summary: {
        totalIncidents: snapshot.insights.equipment_risks,
        totalNearmiss: snapshot.insights.expiring_documents,
        totalAudits: snapshot.summary.activeAlerts,
      },
    };

    const combined = {
      title: 'Reporte Integrado',
      data: [
        { metric: 'Producción', value: snapshot.insights.efficiency },
        { metric: 'Mantenimiento', value: clamp(100 - snapshot.summary.overdueWorkOrders * 10) },
        { metric: 'Seguridad', value: clamp(100 - snapshot.insights.equipment_risks * 8) },
        { metric: 'Financiero', value: clamp(100 - snapshot.summary.expiringContracts * 4) },
      ],
      summary: { overallHealth: snapshot.insights.efficiency },
    };

    const reportData = {
      maintenance,
      production,
      equipment,
      financial,
      hse,
      combined,
    };

    const selected = reportData[reportType as keyof typeof reportData] || reportData.maintenance;

    return NextResponse.json({
      type: reportType,
      dateRange,
      title: selected.title,
      chartData: selected.data,
      summary: selected.summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[v0] Error in reportes API:', error);
    return NextResponse.json(
      { error: 'Error al cargar datos de reportes' },
      { status: 500 }
    );
  }
}
