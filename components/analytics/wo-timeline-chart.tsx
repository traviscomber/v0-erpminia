'use client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

interface WOTimelineChartProps {
  data: {
    date: string;
    created: number;
    completed: number;
  }[];
}

export function WOTimelineChart({ data }: WOTimelineChartProps) {
  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">OT Creadas vs Completadas (últimos 30 días)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" stroke="var(--color-muted-foreground)" style={{ fontSize: '12px' }} />
          <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Bar dataKey="created" fill="#3b82f6" name="Creadas" />
          <Bar dataKey="completed" fill="#10b981" name="Completadas" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
