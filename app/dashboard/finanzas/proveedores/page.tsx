import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Users } from 'lucide-react';
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
          <p className="text-sm font-medium text-muted-foreground">Abastecimiento · Finanzas</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Proveedores</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Administra el maestro financiero de proveedores utilizado por órdenes de compra, abastecimiento y control documental.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/finanzas">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a finanzas
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/compras">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Ir a compras
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <Users className="mb-3 h-5 w-5 text-primary" />
          <p className="font-medium">Maestro único</p>
          <p className="mt-1 text-sm text-muted-foreground">La misma base alimenta compras y reportes financieros.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="font-medium">Identificación tributaria</p>
          <p className="mt-1 text-sm text-muted-foreground">RUT, contacto, correo, teléfono y dirección en un solo registro.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="font-medium">Uso operacional</p>
          <p className="mt-1 text-sm text-muted-foreground">Los proveedores siguen disponibles al crear órdenes de compra.</p>
        </div>
      </div>

      <SuppliersList showPurchaseAction />
    </div>
  );
}
