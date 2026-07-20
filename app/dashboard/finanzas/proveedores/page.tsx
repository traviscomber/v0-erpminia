'use client';

import Link from 'next/link';
import { ArrowRight, FileSpreadsheet, FileText, ShoppingCart, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SuppliersList } from '@/components/compras/suppliers-list';

export default function FinanzasProveedoresPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proveedores</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Directorio real de proveedores cargados desde la tabla `suppliers`. Aquí se revisa la información,
            los datos de contacto y los accesos rápidos sin duplicar inventario ni compras.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/compras/importar-existencias">
            <FileSpreadsheet className="h-4 w-4" />
            Importar proveedores
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Base real</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Suppliers</p>
            <p className="mt-1 text-xs text-muted-foreground">Tabla compartida con Compras y Bodega.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Acciones útiles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">4</p>
            <p className="mt-1 text-xs text-muted-foreground">Importar, revisar, crear OC y consultar documentos.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cobertura</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Real</p>
            <p className="mt-1 text-xs text-muted-foreground">Datos cargados desde la tabla real de proveedores.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Destino natural</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Finanzas</p>
            <p className="mt-1 text-xs text-muted-foreground">Proveedor como entidad de control y seguimiento.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Accesos rápidos</CardTitle>
          <CardDescription>Rutas útiles para revisar la relación financiera de cada proveedor.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/compras/importar-existencias">
              Importar existencias
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/compras">
              Crear orden de compra
              <ShoppingCart className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/finanzas/documentos">
              Documentos de finanzas
              <FileText className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/finanzas">
              Volver a finanzas
              <Users className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <SuppliersList />
    </div>
  );
}
