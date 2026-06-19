import { CostCentersDashboard } from '@/components/dashboard/cost-centers-dashboard';

export const metadata = {
  title: 'Centros de Costos | MOTIL',
  description: 'Vista simple de centros de costos, organizada por grupos principales',
};

export default function CostCentersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Centros de Costos</h1>
        <p className="text-muted-foreground">
          Vista simple de los centros reales, agrupada para que cualquier persona la pueda entender rápido.
        </p>
      </div>

      <CostCentersDashboard />
    </div>
  );
}
