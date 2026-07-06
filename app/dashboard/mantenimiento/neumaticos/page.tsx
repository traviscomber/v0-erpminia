import { NeumaticosBoard } from '@/components/maintenance/neumaticos-board';

export const metadata = {
  title: 'Gestión de neumáticos',
  description: 'Stock real de neumáticos y llantas',
};

export default function MantenimientoNeumaticosPage() {
  return <NeumaticosBoard />;
}
