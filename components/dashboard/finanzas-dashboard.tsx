import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinanzasMovements } from '@/hooks/use-module-apis';
import { useCostCenters } from '@/hooks/use-cost-centers';
import { CostCenterSelect } from '@/components/common/cost-center-select';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCostCenterLabel } from '@/lib/cost-centers';

export function FinanzasDashboard() {
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string>('');
  const { movements, isLoading, error, mutate } = useFinanzasMovements();
  const { costCenters } = useCostCenters();

  if (error) return <div className="text-red-500">Error al cargar movimientos</div>;
  if (isLoading) return <div>Cargando...</div>;

  const filteredMovements = selectedCostCenterId
    ? movements.filter((movement) => (movement as any).cost_center_id === selectedCostCenterId)
    : movements;

  const ingresos = filteredMovements.filter((movement) => movement.type === 'ingreso').reduce((sum, movement) => sum + movement.amount, 0);
  const egresos = filteredMovements.filter((movement) => movement.type === 'egreso').reduce((sum, movement) => sum + movement.amount, 0);
  const balance = ingresos - egresos;

  interface ChartDataPoint {
    date: string;
    ingresos: number;
    egresos: number;
  }

  const chartData: ChartDataPoint[] = [];
  filteredMovements.forEach((movement) => {
    const existing = chartData.find((point) => point.date === movement.date);
    if (existing) {
      if (movement.type === 'ingreso') existing.ingresos += movement.amount;
      else existing.egresos += movement.amount;
    } else {
      chartData.push({
        date: movement.date,
        ingresos: movement.type === 'ingreso' ? movement.amount : 0,
        egresos: movement.type === 'egreso' ? movement.amount : 0,
      });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finanzas</h1>
          <p className="text-muted-foreground">Movimientos y flujo de caja</p>
        </div>
        <Button size="sm" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      <div className="max-w-xs">
        <label className="mb-2 block text-sm font-medium">Filtrar por centro de costo</label>
        <CostCenterSelect
          value={selectedCostCenterId}
          onValueChange={setSelectedCostCenterId}
          placeholder="Todos los centros"
        />
        {selectedCostCenterId ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Centro activo:{' '}
            {formatCostCenterLabel(
              costCenters.find((cc) => cc.id === selectedCostCenterId) ?? { code: '', name: '' }
            )}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">${(ingresos / 1000).toFixed(0)}k</div>
            <p className="text-xs text-muted-foreground">Total de ingresos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex gap-2 text-sm">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Egresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">${(egresos / 1000).toFixed(0)}k</div>
            <p className="text-xs text-muted-foreground">Total de egresos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${(balance / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-muted-foreground">Flujo neto</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flujo de caja - Últimos movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ingresos" fill="#22c55e" name="Ingresos" />
              <Bar dataKey="egresos" fill="#ef4444" name="Egresos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredMovements.slice(0, 10).map((movement) => (
              <div key={movement.id} className="flex justify-between border-b pb-2 text-sm">
                <div>
                  <div className="font-semibold">{movement.description}</div>
                  <div className="text-xs text-muted-foreground">{movement.category}</div>
                </div>
                <div className={movement.type === 'ingreso' ? 'font-bold text-green-500' : 'font-bold text-red-500'}>
                  {movement.type === 'ingreso' ? '+' : '-'}${movement.amount.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
