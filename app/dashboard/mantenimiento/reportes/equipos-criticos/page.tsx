'use client';
import { Loader2, AlertTriangle } from 'lucide-react';
import useSWR from 'swr';
import { EquipmentRiskChart } from '@/components/analytics/equipment-risk-chart';

export default function EquiposCriticosPage() {
  const { data: riskData, isLoading } = useSWR('/api/maintenance/analytics/equipment-risk', async (url) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch risk data');
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
            <AlertTriangle className="h-8 w-8 text-red-600" />
            Equipos Críticos
          </h1>
          <p className="text-muted-foreground mt-2">Análisis de riesgo y confiabilidad de equipos</p>
        </div>

        {/* Risk Chart */}
        {riskData && <EquipmentRiskChart data={riskData} />}
      </div>
    </div>
  );
}
