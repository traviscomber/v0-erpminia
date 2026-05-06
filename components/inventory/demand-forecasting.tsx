import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, Package } from 'lucide-react';

interface DemandForecast {
  week: string;
  actual: number;
  forecast: number;
  confidence: number;
}

interface ReorderSuggestion {
  part_id: string;
  part_name: string;
  current_stock: number;
  forecasted_demand: number;
  recommended_order: number;
  urgency: 'immediate' | 'week' | 'month' | 'low';
  supplier_lead_time: number;
}

interface DemandForecastingProps {
  forecast_data: DemandForecast[];
  reorder_suggestions: ReorderSuggestion[];
}

export function DemandForecasting({ forecast_data, reorder_suggestions }: DemandForecastingProps) {
  const urgencyConfig = {
    immediate: { color: 'bg-red-100 text-red-800', label: 'INMEDIATO' },
    week: { color: 'bg-orange-100 text-orange-800', label: 'ESTA SEMANA' },
    month: { color: 'bg-yellow-100 text-yellow-800', label: 'ESTE MES' },
    low: { color: 'bg-green-100 text-green-800', label: 'BAJO' },
  };

  const accuracyMetrics = {
    avg_confidence: Math.round(forecast_data.reduce((sum, d) => sum + d.confidence, 0) / forecast_data.length),
    total_predicted: forecast_data.reduce((sum, d) => sum + d.forecast, 0),
    total_actual: forecast_data.reduce((sum, d) => sum + d.actual, 0),
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Confianza Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{accuracyMetrics.avg_confidence}%</p>
            <p className="text-xs text-muted-foreground mt-1">Precisión del modelo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Demanda Proyectada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{accuracyMetrics.total_predicted}</p>
            <p className="text-xs text-muted-foreground mt-1">Unidades próximas 4 semanas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Órdenes Sugeridas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {reorder_suggestions.filter(s => s.urgency !== 'low').length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Requieren acción</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Proyección de Demanda</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecast_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="#10b981" name="Real" strokeWidth={2} />
              <Line type="monotone" dataKey="forecast" stroke="#3b82f6" name="Proyectado" strokeDasharray="5 5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sugerencias de Reorden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {reorder_suggestions.map((sugg) => {
            const config = urgencyConfig[sugg.urgency];
            const stock_coverage = Math.round((sugg.current_stock / sugg.forecasted_demand) * 30); // days of stock
            
            return (
              <div key={sugg.part_id} className={`p-3 border-2 rounded-lg ${config.color}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{sugg.part_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Package className="w-3 h-3" />
                      <span className="text-xs">Stock actual: {sugg.current_stock}</span>
                    </div>
                  </div>
                  <Badge className={config.color}>{config.label}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2">
                  <div>
                    <span className="text-muted-foreground">Demanda proyectada</span>
                    <p className="font-semibold">{sugg.forecasted_demand}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sugerir orden</span>
                    <p className="font-semibold">{sugg.recommended_order}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cobertura</span>
                    <p className="font-semibold">{stock_coverage} días</p>
                  </div>
                </div>
                {sugg.supplier_lead_time > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Tiempo de entrega: {sugg.supplier_lead_time} días
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
