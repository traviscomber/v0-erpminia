import { PreventivePlanBoard } from '@/components/maintenance/preventive-plan-board';

export const metadata = {
  title: 'Planificacion preventiva',
  description: 'Programacion preventiva para los proximos 12 meses',
};

export default function MantenimientoPlanificacionPage() {
  return <PreventivePlanBoard />;
}

