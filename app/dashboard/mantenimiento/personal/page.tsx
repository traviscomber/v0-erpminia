import Link from 'next/link';
import { Activity } from 'lucide-react';
import { MaintenancePersonnelPerformanceBoard } from '@/components/maintenance/technician-performance-board';
import { Button } from '@/components/ui/button';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';

export const metadata = {
  title: 'Mecánicos y operarios | Mantenimiento',
  description: 'Desempeño de mecánicos y operarios basado en órdenes de trabajo y actividad real.',
};

export default function MaintenancePersonnelPage() {
  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Mantenimiento · Personal</PageHeaderEyebrow>
          <PageHeaderTitle>Mecánicos y operarios</PageHeaderTitle>
          <PageHeaderDescription>
            Revisa carga de trabajo, productividad e historial de las personas que ejecutan mantenimiento. Los cargos se toman de la matriz vigente; no se usa la categoría genérica “técnico”.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/produccion/trazabilidad">
              <Activity className="h-4 w-4" />
              Trazabilidad operacional
            </Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>
      <MaintenancePersonnelPerformanceBoard />
    </div>
  );
}
