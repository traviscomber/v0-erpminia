import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TechnicalSheetsBoard } from '@/components/maintenance/technical-sheets-board';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Catálogo técnico | Mantenimiento',
  description: 'Acceso central a fichas técnicas y antecedentes de los activos.',
};

export default function TechnicalSheetsPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Documentación técnica</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Catálogo técnico</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Localiza un activo para abrir su ficha técnica. La ficha del activo conserva el resumen operacional,
            mientras esta sección concentra especificaciones, componentes y documentación técnica.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento">
            <ArrowLeft className="h-4 w-4" />
            Volver a mantenimiento
          </Link>
        </Button>
      </section>
      <TechnicalSheetsBoard />
    </div>
  );
}
