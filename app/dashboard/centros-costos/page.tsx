import { CostCentersDashboard } from '@/components/dashboard/cost-centers-dashboard';
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';

export const metadata = {
  title: 'Centros de costos | Motil',
  description: 'Control operacional y financiero por centro de costo',
};

export default function CostCentersPage() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Control transversal</PageHeaderEyebrow>
          <PageHeaderTitle>Centros de costos</PageHeaderTitle>
          <PageHeaderDescription>
            Estructura real de imputación para consultar costos, compras y actividad operacional por unidad responsable.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      <CostCentersDashboard />
    </div>
  );
}
