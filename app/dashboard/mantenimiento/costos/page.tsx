import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MaintenanceCostsBoard } from '@/components/maintenance/maintenance-costs-board';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Costos por equipo | Mantenimiento',
  description: 'Costos reales de mantenimiento por equipo, repuestos y mano de obra.',
};

export default function MantenimientoCostosPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Control financiero</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Costos por equipo</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Analiza repuestos, mano de obra y costo acumulado para priorizar decisiones sobre cada activo.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento">
            <ArrowLeft className="h-4 w-4" />
            Volver a mantenimiento
          </Link>
        </Button>
      </div>
      <MaintenanceCostsBoard />
    </div>
  );
}
