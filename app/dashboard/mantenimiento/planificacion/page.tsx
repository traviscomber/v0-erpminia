import { PreventivePlanBoard } from '@/components/maintenance/preventive-plan-board';

export const metadata = {
  title: 'Planificación preventiva',
  description: 'Programación preventiva para los próximos 12 meses',
};

export default function MantenimientoPlanificacionPage() {
  return <PreventivePlanBoard />;
}
