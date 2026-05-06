import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, Zap } from 'lucide-react';

interface AnomalyPoint {
  timestamp: string;
  value: number;
  is_anomaly: boolean;
  deviation_percentage: number;
  expected_range_min: number;
  expected_range_max: number;
}

interface AnomalyDetectionProps {
  sensor_data: AnomalyPoint[];
  parameter_name: string;
  alert_threshold: number;
}

export function AnomalyDetection({ sensor_data, parameter_name, alert_threshold }: AnomalyDetectionProps) {
  const anomalies = sensor_data.filter(d => d.is_anomaly);
  const anomaly_percentage = ((anomalies.length / sensor_data.length) * 100).toFixed(1);

  const recentAnomalies = anomalies.slice(-5).reverse();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Anomalías Detectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{anomalies.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{anomaly_percentage}% de datos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Desviación Máxima</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {anomalies.length > 0 ? Math.max(...anomalies.map(a => a.deviation_percentage)).toFixed(0) : 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Respecto a normal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Riesgo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${anomalies.length > alert_threshold ? 'text-red-600' : 'text-green-600'}`}>
              {anomalies.length > alert_threshold ? 'ALTO' : 'BAJO'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Nivel de riesgo</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{parameter_name} - Detección de Anomalías</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={sensor_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" style={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload?.[0]) {
                    const data = payload[0].payload as AnomalyPoint;
                    return (
                      <div className="bg-white p-2 border rounded shadow-lg text-xs">
                        <p className="font-semibold">{data.timestamp}</p>
                        <p>Valor: {data.value.toFixed(2)}</p>
                        <p className="text-muted-foreground">Rango: {data.expected_range_min} - {data.expected_range_max}</p>
                        {data.is_anomaly && (
                          <p className="text-red-600 font-medium">Anomalía: {data.deviation_percentage.toFixed(1)}% desv.</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine 
                y={sensor_data[0]?.expected_range_max} 
                stroke="#fca5a5" 
                strokeDasharray="5 5" 
                name="Límite Superior"
              />
              <ReferenceLine 
                y={sensor_data[0]?.expected_range_min} 
                stroke="#fca5a5" 
                strokeDasharray="5 5" 
                name="Límite Inferior"
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                name="Valor"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {recentAnomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Anomalías Recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentAnomalies.map((anom, idx) => (
              <div key={idx} className="p-2 border-l-4 border-red-500 bg-red-50 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{anom.timestamp}</p>
                    <p className="text-xs text-muted-foreground">
                      Valor: {anom.value.toFixed(2)} (Esperado: {anom.expected_range_min} - {anom.expected_range_max})
                    </p>
                    <Badge className="bg-red-100 text-red-800 mt-1 text-xs">
                      Desviación: {anom.deviation_percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
