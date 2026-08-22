import { PlantMetallurgyDashboard } from '@/components/production/plant-metallurgy-dashboard';
import { ProductionFineCloseoutGate } from '@/components/production/production-fine-closeout-gate';

export default function PlantaMetalurgiaPage() {
  return <div className="space-y-6"><PlantMetallurgyDashboard/><ProductionFineCloseoutGate/></div>;
}
