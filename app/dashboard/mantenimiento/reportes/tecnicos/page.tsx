'use client';
import { Loader2, Users } from 'lucide-react';
import useSWR from 'swr';
import { TechnicianPerformanceChart } from '@/components/analytics/technician-performance-chart';

export default function ReportesTecnicosPage() {
  const { data: techData, isLoading } = useSWR('/api/maintenance/analytics/technician-analytics', async (url) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch technician data');
    const json = await res.json();
    return json.data;
  });

  if (isLoading) {
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
            <Users className="h-8 w-8 text-primary" />
            Desempeño de Técnicos
          </h1>
          <p className="text-muted-foreground mt-2">Métricas de eficiencia y productividad (últimos 30 días)</p>
        </div>

        {/* Performance Chart */}
        {techData && <TechnicianPerformanceChart data={techData} />}
      </div>
    </div>
  );
}
