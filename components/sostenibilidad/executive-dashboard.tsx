'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp } from 'lucide-react';

interface ExecutiveDashboardProps {
  period?: string;
}

export function ExecutiveDashboard({ period = 'Ultimo mes' }: ExecutiveDashboardProps) {
  const trendData = [
    { mes: 'Ene', compliance: 75, closure: 12, efficiency: 65 },
    { mes: 'Feb', compliance: 78, closure: 11, efficiency: 68 },
    { mes: 'Mar', compliance: 82, closure: 9, efficiency: 75 },
    { mes: 'Abr', compliance: 85, closure: 8, efficiency: 80 },
    { mes: 'May', compliance: 87, closure: 7, efficiency: 82 },
  ];

  const metricsData = [
    { name: 'Puntaje de cumplimiento', value: '87%', trend: '+5%', color: 'text-green-600' },
    { name: 'Tasa de cierre NC', value: '84%', trend: '+8%', color: 'text-green-600' },
    { name: 'Tiempo promedio de cierre', value: '7 dias', trend: '-40%', color: 'text-green-600' },
    { name: 'Eficiencia operativa', value: '82%', trend: '+15%', color: 'text-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tablero ejecutivo</h2>
        <Button className="gap-2">
          <Download className="w-4 h-4" />
          Exportar reporte
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {metricsData.map((metric) => (
          <Card key={metric.name} className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-sm">{metric.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metric.value}</div>
              <div className={`flex items-center gap-1 text-sm ${metric.color}`}>
                <TrendingUp className="h-3 w-3" />
                {metric.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl shadow-none">
        <CardHeader>
          <CardTitle>Analisis de tendencia - {period}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="compliance" stroke="#10b981" name="Cumplimiento %" />
              <Line type="monotone" dataKey="closure" stroke="#3b82f6" name="Dias de cierre" />
              <Line type="monotone" dataKey="efficiency" stroke="#f59e0b" name="Eficiencia %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-none">
        <CardHeader>
          <CardTitle>Resumen ejecutivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• El cumplimiento mejoro 12% durante el ultimo mes</p>
          <p>• El tiempo promedio de cierre disminuyo 40% gracias a la automatizacion</p>
          <p>• Se identificaron mejoras de eficiencia operativa del 15%</p>
          <p>• Todas las no conformidades criticas quedaron resueltas</p>
        </CardContent>
      </Card>
    </div>
  );
}
