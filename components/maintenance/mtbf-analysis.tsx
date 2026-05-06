import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MTBFTrendData {
  month: string;
  mtbf_hours: number;
  mttr_hours: number;
  target_mtbf: number;
}

interface MTBFAnalysisProps {
  data: MTBFTrendData[];
}

export function MTBFAnalysis({ data }: MTBFAnalysisProps) {
  const avgMTBF = Math.round(data.reduce((sum, d) => sum + d.mtbf_hours, 0) / data.length);
  const avgMTTR = Math.round(data.reduce((sum, d) => sum + d.mttr_hours, 0) / data.length);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Promedio MTBF</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{avgMTBF}h</p>
            <p className="text-xs text-muted-foreground mt-1">Tiempo promedio entre fallos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Promedio MTTR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{avgMTTR}h</p>
            <p className="text-xs text-muted-foreground mt-1">Tiempo promedio de reparación</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tendencia MTBF vs MTTR</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="mtbf_hours" stroke="#10b981" name="MTBF (horas)" />
              <Line type="monotone" dataKey="mttr_hours" stroke="#f59e0b" name="MTTR (horas)" />
              <Line type="monotone" dataKey="target_mtbf" stroke="#3b82f6" strokeDasharray="5 5" name="Target MTBF" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
