import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MaintenanceAuditedCostIntelligence } from '@/components/maintenance/maintenance-audited-cost-intelligence';
import { MaintenanceCostsBoard } from '@/components/maintenance/maintenance-costs-board';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Costos de mantenimiento | Mantenimiento',
  description: 'Costos auditados de órdenes de trabajo y ledger histórico importado, con fuentes separadas.',
};

export default function MantenimientoCostosPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Control financiero</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Costos de mantenimiento</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Separa el costo auditado de órdenes cerradas del ledger histórico importado para evitar conclusiones mezcladas o doble conteo.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento">
            <ArrowLeft className="h-4 w-4" />
            Volver a mantenimiento
          </Link>
        </Button>
      </div>
      <MaintenanceAuditedCostIntelligence />
      <div className="border-t pt-8">
        <p className="mb-4 text-sm font-medium text-muted-foreground">Fuente histórica · ledger importado</p>
        <MaintenanceCostsBoard />
      </div>
    </div>
  );
}
