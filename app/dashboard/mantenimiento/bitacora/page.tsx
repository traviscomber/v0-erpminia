import { MaintenanceHistoryBoard } from '@/components/maintenance/maintenance-history-board';

export const metadata = {
  title: 'Bitácora de mantenimiento',
  description: 'Historial real por equipo y orden de trabajo',
};

export default function MantenimientoBitacoraPage() {
  return <MaintenanceHistoryBoard />;
}
