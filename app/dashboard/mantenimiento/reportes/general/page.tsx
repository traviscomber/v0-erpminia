'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Loader2, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { KPICards } from '@/components/analytics/kpi-cards';
import { WOTimelineChart } from '@/components/analytics/wo-timeline-chart';

export default function ReportesGeneralPage() {
  const { data: summaryData, isLoading: summaryLoading } = useSWR('/api/maintenance/analytics/summary', async (url) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch summary');
    const json = await res.json();
    return json.data;
  });

  const { data: trendData, isLoading: trendLoading } = useSWR('/api/maintenance/analytics/work-order-trends', async (url) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch trends');
    const json = await res.json();
    return json.data;
  });

  if (summaryLoading || trendLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Reportes de Mantenimiento
          </h1>
          <p className="text-muted-foreground mt-2">Análisis en tiempo real de las órdenes de trabajo</p>
        </div>

        {/* KPI Cards */}
        {summaryData && <KPICards data={summaryData} />}

        {/* Timeline Chart */}
        {trendData?.timeline && (
          <WOTimelineChart data={trendData.timeline} />
        )}

        {/* Work Order Types */}
        {trendData?.byType && (
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Distribución por Tipo de OT</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {trendData.byType.map((type: any, idx: number) => (
                <div key={idx} className="p-4 rounded-lg bg-muted">
                  <p className="text-sm font-medium text-muted-foreground capitalize">{type.type}</p>
                  <p className="text-2xl font-bold text-foreground mt-2">{type.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {type.completed} completadas ({Math.round((type.completed / type.count) * 100)}%)
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
