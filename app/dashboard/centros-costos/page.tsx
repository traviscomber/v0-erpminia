import { CostCentersDashboard } from '@/components/dashboard/cost-centers-dashboard';

export const metadata = {
  title: 'Centros de costos | MOTIIL',
  description: 'Control operacional y financiero por centro de costo',
};

export default function CostCentersPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Control transversal · Estructura financiera
        </p>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centros de costos</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Consulta la estructura real de imputación y navega por las unidades que concentran costos, compras y actividad operacional.
          </p>
        </div>
      </header>

      <CostCentersDashboard />
    </div>
  );
}
