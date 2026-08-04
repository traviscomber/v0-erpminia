import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { SuppliersList } from '@/components/compras/suppliers-list';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Proveedores | Finanzas',
  description: 'Directorio y administración de proveedores registrados en Motil.',
};

export default function FinanceSuppliersPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Maestro financiero</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Proveedores</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Consulta y administra la base de proveedores utilizada por órdenes de compra, abastecimiento y control documental.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/compras">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Ir a compras
          </Link>
        </Button>
      </section>

      <SuppliersList showPurchaseAction />
    </div>
  );
}
