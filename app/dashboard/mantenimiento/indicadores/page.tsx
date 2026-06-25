import { MaintenanceIndicatorsBoard } from '@/components/maintenance/maintenance-indicators-board';

export const metadata = {
  title: 'Indicadores de mantencion',
  description: 'MTTR, disponibilidad, OT y costos reales',
};

export default function MantenimientoIndicadoresPage() {
  return <MaintenanceIndicatorsBoard />;
}
