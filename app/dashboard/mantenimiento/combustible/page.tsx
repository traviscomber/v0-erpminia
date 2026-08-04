import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { MaintenanceFuelBoard } from '@/components/maintenance/maintenance-fuel-board';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Combustible | Mantenimiento',
  description: 'Disponibilidad y stock real de combustible desde bodega.',
};

export default function MaintenanceFuelPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Insumos operacionales</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Combustible</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Controla la disponibilidad real de combustible y su relación con el inventario operativo de bodega.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento">
              <ArrowLeft className="h-4 w-4" />
              Mantenimiento
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/combustible/importar">
              <Download className="h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
        </div>
      </div>
      <MaintenanceFuelBoard />
    </div>
  );
}
