import Link from 'next/link';
import { Activity, ArrowRight } from 'lucide-react';
import { AvailabilitySemaphore } from '@/components/maintenance/availability-semaphore';
import { AlertsBanner } from '@/components/maintenance/alerts-banner';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Disponibilidad de equipos | Mantenimiento',
  description: 'Estado observado, cobertura de evidencia y acciones de mantenimiento por equipo',
};

export default function AvailabilityPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Evidencia operacional</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Disponibilidad de equipos</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Estado observado de la flota, cobertura de horómetro y detención, y equipos que requieren acción. El porcentaje de disponibilidad sólo aparece cuando exista una base temporal comparable.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento/equipos">
            Ver tablero de equipos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <Activity className="h-4 w-4 text-primary" />
        La flota se toma del registro canónico; cost centers no se interpretan como equipos y ausencia de evidencia no se convierte en disponibilidad.
      </div>

      <AlertsBanner />
      <AvailabilitySemaphore />
    </div>
  );
}
