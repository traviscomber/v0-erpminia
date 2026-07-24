'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EquipmentRiskChartProps {
  data: {
    equipment_code: string;
    equipment_type: string;
    total_failures: number;
    critical_failures: number;
    total_downtime_hours: number;
    avg_repair_time_hours: number;
    risk_score: number;
    failure_frequency: number;
  }[];
}

export function EquipmentRiskChart({ data }: EquipmentRiskChartProps) {
  const getRiskColor = (score: number) => {
    if (score >= 80) return '#dc2626'; // red
    if (score >= 60) return '#f59e0b'; // amber
    if (score >= 40) return '#eab308'; // yellow
    return '#10b981'; // green
  };

  const chartData = data.map((item) => ({
    name: item.equipment_code.substring(0, 15),
    score: item.risk_score,
    failures: item.total_failures,
  }));

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Equipos con Mayor Riesgo (últimos 90 días)</h3>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="name" stroke="var(--color-muted-foreground)" style={{ fontSize: '11px' }} />
            <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="score" fill="#3b82f6" name="Risk Score">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getRiskColor(data[index].risk_score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Top Riesgos:</h4>
          {data.slice(0, 5).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="flex-1">
                <p className="font-medium text-foreground">{item.equipment_code}</p>
                <p className="text-xs text-muted-foreground">{item.total_failures} fallos en 90 días</p>
              </div>
              <Badge variant="outline" className={getRiskColor(item.risk_score) === '#dc2626' ? 'bg-red-50' : ''}>
                Risk: {item.risk_score}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
