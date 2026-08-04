import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TechnicalSheetsBoard } from '@/components/maintenance/technical-sheets-board';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Fichas técnicas | Mantenimiento',
  description: 'Documentación técnica y antecedentes operacionales de los activos.',
};

export default function TechnicalSheetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Documentación técnica</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Fichas técnicas</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Consulta especificaciones, antecedentes y documentación asociada a los equipos registrados.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento">
            <ArrowLeft className="h-4 w-4" />
            Volver a mantenimiento
          </Link>
        </Button>
      </div>
      <TechnicalSheetsBoard />
    </div>
  );
}
