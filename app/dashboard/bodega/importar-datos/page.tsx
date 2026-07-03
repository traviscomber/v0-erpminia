'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CostCentersImportComponent } from '@/components/bodega/cost-centers-import';
import { BodegaInventoryImportComponent } from '@/components/bodega/bodega-inventory-import';
import { AlertTriangle, Building2, Package, ShieldCheck } from 'lucide-react';

export default function BodegaImportPage() {
  const downloadTemplate = (kind: 'cost-centers' | 'inventory') => {
    const config = {
      'cost-centers': {
        filename: 'plantilla-centros-costo.csv',
        headers: ['CODE', 'NAME', 'DESCRIPTION', 'PARENT_CODE', 'STATUS'],
        rows: [
          ['CC-100', 'Mina Principal', 'Centro principal de operacion', '', 'active'],
          ['CC-110', 'Perforacion', 'Area de perforacion', 'CC-100', 'active'],
        ],
      },
      inventory: {
        filename: 'plantilla-inventario-bodega.csv',
        headers: ['SKU', 'NAME', 'CATEGORY', 'DESCRIPTION', 'QUANTITY', 'MIN_STOCK', 'UNIT_COST'],
        rows: [
          ['SKU-001', 'Pernos 3/4', 'Repuestos', 'Pernos galvanizados', '150', '30', '1200'],
          ['SKU-002', 'Filtro aceite', 'Consumos', 'Filtro para equipos', '40', '10', '8500'],
        ],
      },
    }[kind];

    const csv = [config.headers, ...config.rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = config.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Importar datos de bodega</h1>
        <p className="max-w-3xl text-muted-foreground">
          Carga centros de costo e inventario desde CSV, XLS o XLSX con un flujo seguro, trazable y sin vaciar el resto del sistema.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" onClick={() => downloadTemplate('cost-centers')}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla centros de costo
          </Button>
          <Button variant="outline" onClick={() => downloadTemplate('inventory')}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla inventario
          </Button>
        </div>
      </div>

      <Card className="border-[var(--secondary)]/30 bg-[var(--secondary)]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-[var(--secondary)]" />
            Carga segura
          </CardTitle>
          <CardDescription>La importacion sincroniza por codigo y mantiene el resto intacto.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Centros de costo</p>
            <p className="mt-1 font-semibold">Jerarquia real y trazable</p>
          </div>
          <div className="rounded-lg border border-border bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Inventario</p>
            <p className="mt-1 font-semibold">Stock, costos y ubicacion</p>
          </div>
          <div className="rounded-lg border border-border bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Riesgo controlado</p>
            <p className="mt-1 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              No vacia otras tablas si falla algo
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cost-centers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-4">
          <TabsTrigger value="cost-centers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Centros de costo
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cost-centers" className="mt-6 space-y-4">
          <CostCentersImportComponent />

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-base">Por que centros de costo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Los centros de costo permiten ordenar la operacion por area y familia.</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>Organizar por minas y areas operacionales</li>
                  <li>Asignar presupuestos y costos</li>
                  <li>Generar reportes por ubicacion</li>
                  <li>Integrar con finanzas, mantenimiento y bodega</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="text-base">Estructura jerarquica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Los centros de costo forman una jerarquia simple y ordenada que es facil de leer en la app.</p>
                <div className="space-y-1 rounded bg-white p-3 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Raiz:</span> 1 Mina Peumo
                  </div>
                  <div className="ml-3">- 1-1 Mina</div>
                  <div className="ml-3">- 1-2 Supervision</div>
                  <div className="ml-3">- 1-3 Perforacion Liviana</div>
                  <div>
                    <span className="font-medium text-foreground">Raiz:</span> 4 Planta
                  </div>
                  <div className="ml-3">- 4-1 Chancado</div>
                  <div className="ml-3">- 4-2 Molienda</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="mt-6 space-y-4">
          <BodegaInventoryImportComponent />

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-base">Estructura del inventario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>El inventario se organiza en categorias principales para control operativo y compras.</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>Acero y metalmecanica</li>
                  <li>Consumos de molienda</li>
                  <li>Bombas y fluidos</li>
                  <li>Repuestos y herramientas</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="text-base">Integracion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>El inventario se integra con:</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>Ordenes de mantenimiento</li>
                  <li>Requisiciones de compra</li>
                  <li>Control de stock</li>
                  <li>Reportes de consumo</li>
                  <li>Centros de costo</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
