import Link from 'next/link';
import { NeumaticosBoard } from '@/components/maintenance/neumaticos-board';

export const metadata = {
  title: 'Gestión de neumáticos | Mantenimiento',
  description: 'Stock real de neumáticos, llantas y trazabilidad de ciclo de vida',
};

export default function MantenimientoNeumaticosPage() {
  return (
    <div className="space-y-4">
      <nav aria-label="Contexto del módulo" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/mantenimiento" className="transition-colors hover:text-foreground">
          Mantenimiento
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-foreground">Activos</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Neumáticos</span>
      </nav>
      <NeumaticosBoard />
    </div>
  );
}
