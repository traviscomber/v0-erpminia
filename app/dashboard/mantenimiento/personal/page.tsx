import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TechnicianPerformanceBoard } from '@/components/maintenance/technician-performance-board';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Personal técnico | Mantenimiento',
  description: 'Rendimiento del personal técnico basado en órdenes de trabajo y actividad real.',
};

export default function MaintenancePersonnelPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Gestión de recursos</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Personal técnico</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Revisa carga de trabajo, productividad y desempeño del equipo técnico a partir de las órdenes registradas.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento">
            <ArrowLeft className="h-4 w-4" />
            Volver a mantenimiento
          </Link>
        </Button>
      </div>
      <TechnicianPerformanceBoard />
    </div>
  );
}
