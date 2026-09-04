import { GeologiaDashboard } from '@/components/production/geologia-dashboard';
import { GeologiaHistoricalCanonical } from '@/components/production/geologia-historical-canonical';

export default function GeologiaPage() {
  return <div className="space-y-6">
    <style>{`nav[aria-label="Vistas de Geología"] > button:last-child { display: none !important; }`}</style>
    <GeologiaDashboard />
    <GeologiaHistoricalCanonical />
  </div>;
}
