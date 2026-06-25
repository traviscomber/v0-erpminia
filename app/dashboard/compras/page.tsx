'use client';

import Link from 'next/link';
import AdquisicionesPage from '../documentos-gestion/adquisiciones/page';
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
        <p className="mt-2 text-muted-foreground">Crea, revisa y sigue ordenes de compra con trazabilidad operativa real.</p>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Importar existencias y proveedores</CardTitle>
          <CardDescription>
            Sube el Excel con proveedores, compras y stock min-max para dejar la base de abastecimiento lista en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/compras/importar-existencias">Abrir importador</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <PurchaseOrderForm />
        <Card>
          <CardHeader>
            <CardTitle>Flujo de compras</CardTitle>
            <CardDescription>El formulario crea ordenes en borrador y la lista muestra el estado operativo real.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Ingresar proveedor, codigo y cantidad.</p>
            <p>2. Revisar el total generado antes de enviar.</p>
            <p>3. Buscar ordenes por numero, proveedor o codigo.</p>
            <p>4. Descargar el detalle cuando se necesite respaldo.</p>
          </CardContent>
        </Card>
      </div>

      <PurchaseOrdersList />

      <SuppliersList />

      <AdquisicionesPage />
    </div>
  );
}
