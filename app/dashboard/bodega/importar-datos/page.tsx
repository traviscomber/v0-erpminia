import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CostCentersImportComponent } from '@/components/bodega/cost-centers-import';
import { BodegaInventoryImportComponent } from '@/components/bodega/bodega-inventory-import';
import { Building2, Package } from 'lucide-react';

export default function BodegaImportPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Importar datos de bodega</h1>
        <p className="text-muted-foreground">
          Importa centros de costos e inventario en formato CSV, XLS o XLSX.
        </p>
      </div>

      <Tabs defaultValue="cost-centers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-4">
          <TabsTrigger value="cost-centers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Centros de costos
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
                <CardTitle className="text-base">¿Por qué centros de costos?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Los centros de costos permiten:</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>Organizar por minas (Peumo, Don Jaime, etc.)</li>
                  <li>Agrupar por áreas operacionales</li>
                  <li>Asignar presupuestos y costos</li>
                  <li>Generar reportes por ubicación</li>
                  <li>Integrar con finanzas y mantenimiento</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="text-base">Estructura jerárquica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Los centros de costos forman una jerarquía:</p>
                <div className="space-y-1 rounded bg-white p-2 font-mono text-xs text-muted-foreground">
                  <div>Mina Peumo</div>
                  <div className="ml-3">→ Perforación</div>
                  <div className="ml-3">→ Tronadura</div>
                  <div className="ml-3">→ Carguío</div>
                  <div>Planta</div>
                  <div className="ml-3">→ Chancado</div>
                  <div className="ml-3">→ Molienda</div>
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
                <p>El inventario se organiza en categorías:</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>Acero (tuberías, pletinas, ángulos, etc.)</li>
                  <li>Bola (acero para molienda)</li>
                  <li>Bomba (repuestos para bombas)</li>
                  <li>Y muchas más categorías...</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="text-base">Integración</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>El inventario se integra con:</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>Órdenes de mantenimiento</li>
                  <li>Requisiciones de compra</li>
                  <li>Control de stock</li>
                  <li>Reportes de consumo</li>
                  <li>Centros de costos</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
