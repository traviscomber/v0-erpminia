'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, FileSpreadsheet, Plus } from 'lucide-react';
import { PurchaseOrderForm } from '@/components/compras/purchase-order-form';
import { PurchaseOrdersList } from '@/components/compras/purchase-orders-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ComprasPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Abastecimiento · Compras</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Órdenes de compra</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Crea, revisa y controla órdenes de compra con trazabilidad operacional y financiera.
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">1. Crear orden</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Define producto, cantidad, costo y condiciones antes de guardar la orden.
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">2. Controlar estado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Revisa folio, total y estado operacional desde el registro central.
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">3. Mantener respaldo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Conserva la trazabilidad y el soporte documental de cada compra.
          </CardContent>
        </Card>
      </div>

      <section id="nueva-orden" className="grid gap-6 xl:grid-cols-[minmax(360px,440px)_1fr]">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
          <PurchaseOrderForm />
        </Suspense>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Importación de abastecimiento</CardTitle>
            <CardDescription>
              Carga compras y niveles mínimo-máximo desde el archivo existente sin reemplazar registros actuales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard/compras/importar-existencias">
                Abrir importador
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Control operativo</p>
          <h2 className="text-xl font-semibold tracking-tight">Registro de órdenes</h2>
        </div>
        <PurchaseOrdersList />
      </section>
    </div>
  );
}
