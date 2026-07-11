import { MaintenanceDashboardByCC } from '@/components/dashboard/maintenance-dashboard-by-cc';

export const metadata = {
  title: 'Mantenimiento por Centro de Costos',
  description: 'Ordenes de mantenimiento agrupadas por centro de costos',
};

export default function MantenimientoByCC() {
  return <MaintenanceDashboardByCC />;
}
