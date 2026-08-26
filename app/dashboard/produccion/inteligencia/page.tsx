import { MineSectorIntelligence } from '@/components/production/mine-sector-intelligence';
import { ProductionConfidencePanel } from '@/components/production/production-confidence-panel';

export default function ProduccionInteligenciaPage() {
  return (
    <div className="space-y-6">
      <ProductionConfidencePanel />
      <MineSectorIntelligence />
    </div>
  );
}
