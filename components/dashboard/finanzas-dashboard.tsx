import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinanzasMovements } from '@/hooks/use-module-apis';
import { useCostCenters } from '@/hooks/use-cost-centers';
import { CostCenterSelect } from '@/components/common/cost-center-select';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export function FinanzasDashboard() {
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string>('');
  const { movements, isLoading, error, mutate } = useFinanzasMovements();
  const { costCenters } = useCostCenters();

  if (error) return <div className="text-red-500">Error cargando movimientos</div>;
  if (isLoading) return <div>Cargando...</div>;

  // Filter movements by cost center if selected
  const filteredMovements = selectedCostCenterId
    ? movements.filter(m => (m as any).cost_center_id === selectedCostCenterId)
    : movements;

  const ingresos = filteredMovements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0);
  const egresos = filteredMovements.filter(m => m.type === 'egreso').reduce((sum, m) => sum + m.amount, 0);
  const balance = ingresos - egresos;

  // Agrupar por fecha para gráfico
  // Group by date for chart data
  interface ChartDataPoint {
    date: string;
    ingresos: number;
    egresos: number;
  }
  const chartData: ChartDataPoint[] = [];
  filteredMovements.forEach((m) => {
    const existing = chartData.find((x) => x.date === m.date);
    if (existing) {
      if (m.type === 'ingreso') existing.ingresos += m.amount;
      else existing.egresos += m.amount;
    } else {
      chartData.push({
        date: m.date,
        ingresos: m.type === 'ingreso' ? m.amount : 0,
        egresos: m.type === 'egreso' ? m.amount : 0,
      });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
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
        <label className="text-sm font-medium mb-2 block">Filtrar por Centro de Costos</label>
        <CostCenterSelect
          value={selectedCostCenterId}
          onValueChange={setSelectedCostCenterId}
          placeholder="Todos los centros"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex gap-2">
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
            <CardTitle className="text-sm flex gap-2">
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
          <CardTitle>Flujo de Caja - Últimos movimientos</CardTitle>
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
          <CardTitle>Movimientos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredMovements.slice(0, 10).map(m => (
              <div key={m.id} className="flex justify-between text-sm border-b pb-2">
                <div>
                  <div className="font-semibold">{m.description}</div>
                  <div className="text-xs text-muted-foreground">{m.category}</div>
                </div>
                <div className={m.type === 'ingreso' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                  {m.type === 'ingreso' ? '+' : '-'}${m.amount.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
