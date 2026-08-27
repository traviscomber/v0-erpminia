import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProgressiveWorkOrderCloseQueue } from '@/components/maintenance/progressive-work-order-close-queue';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Cierre progresivo de OT | Mantenimiento',
  description: 'Cola operacional para completar evidencia y cerrar órdenes de trabajo con costo auditado.',
};

export default function WorkOrderCloseQueuePage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Cierre controlado</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Cierre progresivo de OT</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Motil muestra una sola acción siguiente por vez. Cada guardado recalcula los bloqueos y el cierre final congela el costo auditado de la intervención.
          </p>
        </div>
        <Button asChild variant="outline"><Link href="/dashboard/mantenimiento/ordenes-trabajo"><ArrowLeft className="mr-2 h-4 w-4" />Volver a órdenes</Link></Button>
      </section>
      <ProgressiveWorkOrderCloseQueue />
    </div>
  );
}
