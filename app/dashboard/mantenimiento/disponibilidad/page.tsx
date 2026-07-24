import { AvailabilitySemaphore } from '@/components/maintenance/availability-semaphore';

export const metadata = {
  title: 'Disponibilidad de Equipos | Mantenimiento',
  description: 'Dashboard de disponibilidad en tiempo real de equipos de mantenimiento',
};

export default function AvailabilityPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Disponibilidad de Equipos</h1>
        <p className="text-gray-600 mt-1">
          Visualización en tiempo real del estado operativo de los equipos
        </p>
      </div>

      {/* Main Component */}
      <AvailabilitySemaphore />
    </div>
  );
}
