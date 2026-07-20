import { NeumaticosBoard } from '@/components/maintenance/neumaticos-board';

export const metadata = {
  title: 'Gestión de neumáticos',
  description: 'Stock real de neumáticos, llantas y trazabilidad de ciclo de vida',
};

export default function MantenimientoNeumaticosPage() {
  return <NeumaticosBoard />;
}
