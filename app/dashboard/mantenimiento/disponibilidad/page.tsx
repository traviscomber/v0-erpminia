import { AvailabilitySemaphore } from '@/components/maintenance/availability-semaphore';
import { AlertsBanner } from '@/components/maintenance/alerts-banner';

export const metadata = {
  title: 'Disponibilidad de Equipos | Mantenimiento',
  description: 'Dashboard de disponibilidad en tiempo real de equipos de mantenimiento',
};

export default function AvailabilityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Disponibilidad de Equipos</h1>
        <p className="mt-1 text-muted-foreground">
          Visualizacion en tiempo real del estado operativo de los equipos
        </p>
      </div>

      {/* Live alerts — only renders when there are active alerts */}
      <AlertsBanner />

      <AvailabilitySemaphore />
    </div>
  );
}
