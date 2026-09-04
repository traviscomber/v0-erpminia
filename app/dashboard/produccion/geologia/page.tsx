import { GeologiaDashboard } from '@/components/production/geologia-dashboard';
import { GeologiaHistoricalCanonical } from '@/components/production/geologia-historical-canonical';

export default function GeologiaPage() {
  return <div className="space-y-6">
    <style>{`
      nav[aria-label="Vistas de Geología"] {
        position: sticky;
        top: 3.5rem;
        z-index: 30;
        margin-left: -0.5rem;
        margin-right: -0.5rem;
        padding: 0.75rem 0.5rem;
        background: hsl(var(--background) / 0.96);
        backdrop-filter: blur(10px);
      }
      nav[aria-label="Vistas de Geología"] > button:last-child {
        display: none !important;
      }
    `}</style>
    <GeologiaDashboard />
    <GeologiaHistoricalCanonical />
  </div>;
}
