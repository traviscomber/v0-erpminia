import { MaintenancePersonnelBoard } from '@/components/maintenance/maintenance-personnel-board';

export const metadata = {
  title: 'Personal de mantenimiento',
  description: 'Horas y técnicos reales del módulo de mantenimiento',
};

export default function MaintenancePersonnelPage() {
  return <MaintenancePersonnelBoard />;
}
