import { MaintenancePersonnelBoard } from '@/components/maintenance/maintenance-personnel-board';

export const metadata = {
  title: 'Personal de mantencion',
  description: 'Horas y tecnicos reales del modulo de mantenimiento',
};

export default function MaintenancePersonnelPage() {
  return <MaintenancePersonnelBoard />;
}
