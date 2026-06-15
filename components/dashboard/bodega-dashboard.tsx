import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBodegaInventory } from '@/hooks/use-module-apis';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export function BodegaDashboard() {
  const { inventory, isLoading, error, mutate } = useBodegaInventory();

  if (error) return <div className="text-red-500">Error cargando inventario</div>;
  if (isLoading) return <div>Cargando...</div>;

  const lowStock = inventory.filter(item => item.quantity <= item.min_stock);
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bodega</h1>
          <p className="text-muted-foreground">Gestión de inventario</p>
        </div>
        <Button size="sm" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Items en Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{inventory.length}</div>
            <p className="text-xs text-muted-foreground">Total de ítems</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{lowStock.length}</div>
            <p className="text-xs text-muted-foreground">Por debajo del mínimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalValue / 1000).toFixed(1)}k</div>
            <p className="text-xs text-muted-foreground">Inventario valorizado</p>
          </CardContent>
        </Card>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Alertas de Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStock.map(item => (
                <div key={item.id} className="text-sm">
                  <span className="font-semibold">{item.name}</span> - {item.quantity} unidades ({item.min_stock} mínimo)
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">SKU</th>
                  <th className="text-left p-2">Producto</th>
                  <th className="text-right p-2">Cantidad</th>
                  <th className="text-right p-2">Costo Unit.</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">{item.sku}</td>
                    <td className="p-2">{item.name}</td>
                    <td className="text-right p-2">{item.quantity}</td>
                    <td className="text-right p-2">${item.unit_cost}</td>
                    <td className="text-right p-2 font-semibold">${(item.quantity * item.unit_cost).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
