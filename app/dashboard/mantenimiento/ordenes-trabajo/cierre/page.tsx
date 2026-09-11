import { ProgressiveWorkOrderCloseQueue } from '@/components/maintenance/progressive-work-order-close-queue';
import { PageHeader, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';

export const metadata = {
  title: 'Cierre controlado de OT | Mantenimiento',
  description: 'Cola operacional para completar la evidencia faltante y cerrar órdenes de trabajo con trazabilidad auditada.',
};

export default function WorkOrderCloseQueuePage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Mantenimiento · cierre controlado</PageHeaderEyebrow>
          <PageHeaderTitle>Qué falta para cerrar la siguiente OT</PageHeaderTitle>
          <PageHeaderDescription>
            MOTIL expone una sola acción siguiente por vez. El cierre sólo avanza con evidencia operacional suficiente y mantiene la decisión final en el usuario autorizado.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      <ProgressiveWorkOrderCloseQueue />
    </div>
  );
}
