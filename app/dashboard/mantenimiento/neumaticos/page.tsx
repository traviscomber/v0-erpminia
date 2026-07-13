import { NeumaticosBoard } from '@/components/maintenance/neumaticos-board';

export const metadata = {
  title: 'Gestion de neumaticos',
  description: 'Stock real de neumaticos, llantas y trazabilidad de ciclo de vida',
};

export default function MantenimientoNeumaticosPage() {
  return <NeumaticosBoard />;
}
