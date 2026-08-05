import { SuppliersList } from '@/components/compras/suppliers-list';

export const metadata = {
  title: 'Proveedores | Finanzas',
  description: 'Maestro canónico y desempeño de proveedores.',
};

export default function FinanceSuppliersPage() {
  return (
    <div className="space-y-6">
      <section className="border-b border-border/70 pb-6">
        <p className="text-sm font-medium text-muted-foreground">Finanzas · Abastecimiento</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Proveedores</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Un solo maestro conecta identidad, órdenes de compra, productos, gasto, condiciones y calidad de información.</p>
      </section>
      <SuppliersList />
    </div>
  );
}
