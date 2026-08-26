import { DrillingEquipmentTrend } from '@/components/production/drilling-equipment-trend';
import { MineSectorIntelligence } from '@/components/production/mine-sector-intelligence';
import { ProductionConfidencePanel } from '@/components/production/production-confidence-panel';
import { ProductionTrendIntelligence } from '@/components/production/production-trend-intelligence';

export default function ProduccionInteligenciaPage() {
  return (
    <div className="space-y-6">
      <ProductionConfidencePanel />
      <ProductionTrendIntelligence />
      <DrillingEquipmentTrend />
      <MineSectorIntelligence />
    </div>
  );
}
