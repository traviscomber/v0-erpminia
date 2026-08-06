'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, Plus } from 'lucide-react';
import { PurchaseOrderForm } from '@/components/compras/purchase-order-form';
import { PurchaseOrdersList } from '@/components/compras/purchase-orders-list';
import { OperationalPipelineBoard } from '@/components/pipeline/operational-pipeline-board';
import { Button } from '@/components/ui/button';

export default function ComprasPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Abastecimiento · Compras</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Pipeline de abastecimiento</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Necesidad, cotización, orden, recepción y entrega en un solo flujo, con una acción siguiente por caso.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/compras/importar-existencias">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Importar existencias
            </Link>
          </Button>
          <Button asChild>
            <Link href="#nueva-orden">
              <Plus className="mr-2 h-4 w-4" />
              Nueva orden
            </Link>
          </Button>
        </div>
      </section>

      <OperationalPipelineBoard />

      <section id="nueva-orden" className="space-y-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Creación manual</p>
          <h2 className="text-xl font-semibold tracking-tight">Nueva orden de compra</h2>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
          <PurchaseOrderForm />
        </Suspense>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Registro central</p>
          <h2 className="text-xl font-semibold tracking-tight">Órdenes de compra</h2>
        </div>
        <PurchaseOrdersList />
      </section>
    </div>
  );
}
