import { GeologiaDashboard } from '@/components/production/geologia-dashboard';
import { GeologiaHistoricalCanonical } from '@/components/production/geologia-historical-canonical';

export default function GeologiaPage() {
  return <div className="space-y-6">
    <GeologiaDashboard />
    <GeologiaHistoricalCanonical />
  </div>;
}
