import Link from 'next/link';
import { Download } from 'lucide-react';
import { MaintenanceFuelBoard } from '@/components/maintenance/maintenance-fuel-board';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Combustible',
  description: 'Resumen real del stock de combustible desde bodega',
};

export default function MaintenanceFuelPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Combustible</h1>
          <p className="mt-2 text-muted-foreground">
            Resumen real del stock de combustible desde bodega, con acceso directo a importación Excel.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento/combustible/importar">
            <Download className="h-4 w-4" />
            Importar Excel
          </Link>
        </Button>
      </div>
      <MaintenanceFuelBoard />
    </div>
  );
}
