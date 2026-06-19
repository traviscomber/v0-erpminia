import { CostCentersDashboard } from '@/components/dashboard/cost-centers-dashboard';

export const metadata = {
  title: 'Centros de Costos - MOTIL',
  description: 'Gestión de centros de costos por mina y departamento',
};

export default function CostCentersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Centros de Costos</h1>
        <p className="text-gray-600">
          Gestión jerárquica de 277 centros: minas, supervisiones y departamentos
        </p>
      </div>

      <CostCentersDashboard />
    </div>
  );
}
