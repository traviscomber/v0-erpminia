import Link from 'next/link';
import { ComponentesMayoresBoard } from '@/components/maintenance/componentes-mayores-board';

export const metadata = {
  title: 'Componentes mayores | Mantenimiento',
  description: 'Estado real de componentes mayores por vehículo',
};

export default function MantenimientoComponentesMayoresPage() {
  return (
    <div className="space-y-4">
      <nav aria-label="Contexto del módulo" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/mantenimiento" className="transition-colors hover:text-foreground">
          Mantenimiento
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-foreground">Activos</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Componentes mayores</span>
      </nav>
      <ComponentesMayoresBoard />
    </div>
  );
}
