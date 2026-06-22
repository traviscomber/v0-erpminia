'use client';

import AdquisicionesPage from '../documentos-gestion/adquisiciones/page';
import { PurchaseOrderForm } from '@/components/compras/purchase-order-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ComprasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compras</h1>
        <p className="mt-2 text-muted-foreground">Crea, revisa y sigue ordenes de compra con trazabilidad operativa.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <PurchaseOrderForm />
        <Card>
          <CardHeader>
            <CardTitle>Flujo de compras</CardTitle>
            <CardDescription>El formulario crea ordenes en borrador y la lista muestra el estado operativo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Ingresar proveedor, item y cantidad.</p>
            <p>2. Revisar el total generado antes de enviar.</p>
            <p>3. Buscar ordenes por numero, proveedor o item.</p>
            <p>4. Descargar el detalle cuando se necesite respaldo.</p>
          </CardContent>
        </Card>
      </div>

      <AdquisicionesPage />
    </div>
  );
}
