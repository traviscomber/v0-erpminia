'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, Plus } from 'lucide-react';
import { PurchaseOrderForm } from '@/components/compras/purchase-order-form';
import { PurchaseOrdersList } from '@/components/compras/purchase-orders-list';
import { OperationalPipelineBoard } from '@/components/pipeline/operational-pipeline-board';
import { Button } from '@/components/ui/button';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

export default function ComprasPage() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Abastecimiento · Compras</PageHeaderEyebrow>
          <PageHeaderTitle>Compras y órdenes</PageHeaderTitle>
          <PageHeaderDescription>
            Requerimientos, cotizaciones, órdenes, recepciones y entregas reunidos en un solo flujo de trabajo.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline">
            <Link href="/dashboard/compras/importar-existencias">
              <FileSpreadsheet className="h-4 w-4" />Importar existencias
            </Link>
          </Button>
          <Button asChild>
            <Link href="#crear-orden"><Plus className="h-4 w-4" />Crear orden</Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <section aria-labelledby="flujo-compras" className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Seguimiento</p>
          <h2 id="flujo-compras" className="mt-1 text-xl font-semibold tracking-tight">Flujo de compras</h2>
          <p className="mt-1 text-sm text-muted-foreground">Revisa qué necesita atención y cuál es el siguiente paso de cada solicitud.</p>
        </div>
        <OperationalPipelineBoard />
      </section>

      <section id="crear-orden" aria-labelledby="titulo-crear-orden" className="scroll-mt-20 space-y-3 rounded-lg border bg-card p-4 sm:p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Nueva compra</p>
          <h2 id="titulo-crear-orden" className="mt-1 text-xl font-semibold tracking-tight">Crear orden de compra</h2>
          <p className="mt-1 text-sm text-muted-foreground">Completa únicamente la información necesaria para emitir la orden.</p>
        </div>
        <Suspense fallback={<StatePanel tone="loading" title="Preparando formulario" description="Cargando los datos necesarios para crear la orden." />}>
          <PurchaseOrderForm />
        </Suspense>
      </section>

      <section aria-labelledby="registro-ordenes" className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Historial y seguimiento</p>
          <h2 id="registro-ordenes" className="mt-1 text-xl font-semibold tracking-tight">Órdenes de compra</h2>
          <p className="mt-1 text-sm text-muted-foreground">Consulta las órdenes registradas y abre cada caso para continuar su gestión.</p>
        </div>
        <PurchaseOrdersList />
      </section>
    </div>
  );
}
