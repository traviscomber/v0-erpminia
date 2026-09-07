import { ChevronDown } from 'lucide-react';
import { DrillingEquipmentTrend } from '@/components/production/drilling-equipment-trend';
import { MineSectorIntelligence } from '@/components/production/mine-sector-intelligence';
import { ProductionConfidencePanel } from '@/components/production/production-confidence-panel';
import { ProductionForecastPanel } from '@/components/production/production-forecast-panel';
import { ProductionTrendIntelligence } from '@/components/production/production-trend-intelligence';

export default function ProduccionInteligenciaPage() {
  return (
    <div className="space-y-6">
      <MineSectorIntelligence />

      <details className="group rounded-lg border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
          <div>
            <p className="font-medium">Análisis complementario</p>
            <p className="mt-1 text-xs text-muted-foreground">Confianza de fuentes, forecast, tendencias globales y señales de equipos. No forman parte de la lectura primaria Mina / Sector.</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-6 border-t p-5">
          <ProductionConfidencePanel />
          <ProductionForecastPanel />
          <ProductionTrendIntelligence />
          <DrillingEquipmentTrend />
        </div>
      </details>
    </div>
  );
}
