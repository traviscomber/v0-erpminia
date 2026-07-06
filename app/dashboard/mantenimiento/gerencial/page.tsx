import { MaintenanceExecutiveDashboard } from '@/components/maintenance/maintenance-executive-dashboard';

export const metadata = {
  title: 'Dashboard gerencial de mantenimiento',
  description: 'Vista ejecutiva con KPIs reales de mantenimiento',
};

export default function MaintenanceExecutivePage() {
  return <MaintenanceExecutiveDashboard />;
}
