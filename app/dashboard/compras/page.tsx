'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { PurchaseOrderForm } from '@/components/compras/purchase-order-form';
import { SuppliersList } from '@/components/compras/suppliers-list';
import { PurchaseOrdersList } from '@/components/compras/purchase-orders-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ComprasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compras</h1>
        <p className="mt-2 text-muted-foreground">Crea, revisa y sigue órdenes de compra con trazabilidad operativa real.</p>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Importar existencias y proveedores</CardTitle>
          <CardDescription>
            Sube el Excel con proveedores, compras y stock mínimo-máximo para dejar la base de abastecimiento lista en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/compras/importar-existencias">Abrir importador</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
          <PurchaseOrderForm />
        </Suspense>
        <Card>
          <CardHeader>
            <CardTitle>Flujo de compras</CardTitle>
            <CardDescription>El formulario crea órdenes en borrador y la lista muestra el estado operativo real.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Ingresar proveedor, código y cantidad.</p>
            <p>2. Revisar el total generado antes de enviar.</p>
            <p>3. Buscar órdenes por número, proveedor o código.</p>
            <p>4. Descargar el detalle cuando se necesite respaldo.</p>
          </CardContent>
        </Card>
      </div>

      <PurchaseOrdersList />

      <SuppliersList />
    </div>
  );
}
