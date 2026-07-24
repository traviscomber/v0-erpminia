'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TechnicianAnalyticsChartProps {
  data: {
    name: string;
    cargo: string;
    total_orders: number;
    completed_orders: number;
    pending_orders: number;
    critical_orders: number;
    total_hours_logged: number;
    avg_completion_time_hours: number;
    efficiency_score: number;
    on_time_rate: number;
    completion_rate?: number;
  }[];
}

export function TechnicianPerformanceChart({ data }: TechnicianAnalyticsChartProps) {
  const chartData = data.map((tech) => ({
    name: tech.name.split(' ')[0], // First name only
    score: tech.efficiency_score,
    completed: tech.completed_orders,
    hours: Math.round(tech.total_hours_logged),
  }));

  return (
    <Card className="p-6 bg-card border-border space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Desempeño de Técnicos (últimos 30 días)</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="name" stroke="var(--color-muted-foreground)" style={{ fontSize: '12px' }} />
          <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Bar dataKey="score" fill="#8b5cf6" name="Efficiency Score" />
          <Bar dataKey="completed" fill="#10b981" name="OT Completadas" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-1 gap-3">
        {data.slice(0, 5).map((tech, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div className="flex-1">
              <p className="font-medium text-foreground">{tech.name}</p>
              <p className="text-xs text-muted-foreground">{tech.cargo}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{tech.efficiency_score}%</p>
              <p className="text-xs text-muted-foreground">{tech.completed_orders} completadas</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
