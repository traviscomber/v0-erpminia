import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface CashFlowData {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
  forecast: number;
}

interface CashFlowProps {
  data: CashFlowData[];
  budget_limit: number;
}

export function CashFlowAnalysis({ data, budget_limit }: CashFlowProps) {
  const totalInflow = data.reduce((sum, d) => sum + d.inflow, 0);
  const totalOutflow = data.reduce((sum, d) => sum + d.outflow, 0);
  const netCashFlow = totalInflow - totalOutflow;
  
  const currentMonth = data[data.length - 1];
  const percentageUsed = (totalOutflow / budget_limit) * 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">CLP {(totalInflow / 1e6).toFixed(1)}M</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <p className="text-xs text-muted-foreground">Total período</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">CLP {(totalOutflow / 1e6).toFixed(1)}M</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3" />
              <p className="text-xs text-muted-foreground">Total período</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Flujo Neto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netCashFlow > 0 ? 'text-green-600' : 'text-red-600'}`}>
              CLP {(netCashFlow / 1e6).toFixed(1)}M
            </p>
            <p className="text-xs text-muted-foreground mt-1">Posición actual</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Presupuesto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{percentageUsed.toFixed(0)}%</p>
              {percentageUsed > 90 && <AlertCircle className="w-4 h-4 text-red-600" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Utilizado de CLP {(budget_limit / 1e6).toFixed(1)}M</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Flujo Efectivo (Ingresos vs Egresos)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => `CLP ${(value / 1e6).toFixed(2)}M`} />
              <Legend />
              <Area type="monotone" dataKey="inflow" fill="#10b981" stroke="#10b981" name="Ingresos" />
              <Area type="monotone" dataKey="outflow" fill="#ef4444" stroke="#ef4444" name="Egresos" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Análisis de Varianza Presupuestaria</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => `CLP ${(value / 1e6).toFixed(2)}M`} />
              <Legend />
              <Bar dataKey="outflow" fill="#ef4444" name="Gasto Real" />
              <Bar dataKey="forecast" fill="#3b82f6" name="Presupuestado" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
