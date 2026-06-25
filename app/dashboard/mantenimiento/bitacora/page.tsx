import { MaintenanceHistoryBoard } from '@/components/maintenance/maintenance-history-board';

export const metadata = {
  title: 'Bitacora de mantenimiento',
  description: 'Historial real por equipo y orden de trabajo',
};

export default function MantenimientoBitacoraPage() {
  return <MaintenanceHistoryBoard />;
}
