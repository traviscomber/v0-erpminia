import { MaintenanceCostsBoard } from '@/components/maintenance/maintenance-costs-board';

export const metadata = {
  title: 'Costo por equipo',
  description: 'Costos reales por equipo, repuestos y mano de obra',
};

export default function MantenimientoCostosPage() {
  return <MaintenanceCostsBoard />;
}
