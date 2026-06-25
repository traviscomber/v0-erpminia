import { MaintenanceFuelBoard } from '@/components/maintenance/maintenance-fuel-board';

export const metadata = {
  title: 'Combustible',
  description: 'Resumen real del stock de combustible desde bodega',
};

export default function MaintenanceFuelPage() {
  return <MaintenanceFuelBoard />;
}
