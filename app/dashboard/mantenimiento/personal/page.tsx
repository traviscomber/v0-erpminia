import { TechnicianPerformanceBoard } from '@/components/maintenance/technician-performance-board';

export const metadata = {
  title: 'Desempeno de Tecnicos | Mantenimiento',
  description: 'Ranking y metricas de rendimiento de tecnicos de mantenimiento por ordenes de trabajo completadas',
};

export default function MaintenancePersonnelPage() {
  return <TechnicianPerformanceBoard />;
}
