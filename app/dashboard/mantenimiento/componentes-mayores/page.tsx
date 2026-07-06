import { ComponentesMayoresBoard } from '@/components/maintenance/componentes-mayores-board';

export const metadata = {
  title: 'Componentes mayores',
  description: 'Estado real de componentes mayores por vehículo',
};

export default function MantenimientoComponentesMayoresPage() {
  return <ComponentesMayoresBoard />;
}
