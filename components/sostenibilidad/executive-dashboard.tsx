'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp } from 'lucide-react';

interface ExecutiveDashboardProps {
  period?: string;
}

export function ExecutiveDashboard({ period = 'Último Mes' }: ExecutiveDashboardProps) {
  const trendData = [
    { mes: 'Ene', compliance: 75, closure: 12, efficiency: 65 },
    { mes: 'Feb', compliance: 78, closure: 11, efficiency: 68 },
    { mes: 'Mar', compliance: 82, closure: 9, efficiency: 75 },
    { mes: 'Abr', compliance: 85, closure: 8, efficiency: 80 },
    { mes: 'May', compliance: 87, closure: 7, efficiency: 82 },
  ];

  const metricsData = [
    { name: 'Compliance Score', value: '87%', trend: '+5%', color: 'text-green-600' },
    { name: 'NC Closure Rate', value: '84%', trend: '+8%', color: 'text-green-600' },
    { name: 'Avg Time to Close', value: '7 days', trend: '-40%', color: 'text-green-600' },
    { name: 'Resource Efficiency', value: '82%', trend: '+15%', color: 'text-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Executive Dashboard</h2>
        <Button className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {metricsData.map(metric => (
          <Card key={metric.name}>
            <CardHeader>
              <CardTitle className="text-sm">{metric.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metric.value}</div>
              <div className={`text-sm ${metric.color} flex items-center gap-1`}>
                <TrendingUp className="w-3 h-3" />
                {metric.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Analysis - {period}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="compliance" stroke="#10b981" name="Compliance %" />
              <Line type="monotone" dataKey="closure" stroke="#3b82f6" name="Days to Close" />
              <Line type="monotone" dataKey="efficiency" stroke="#f59e0b" name="Efficiency %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• Compliance score improved 12% over the past month</p>
          <p>• Average closure time reduced by 40% through automation</p>
          <p>• Resource efficiency gains of 15% identified</p>
          <p>• All critical non-conformities resolved</p>
        </CardContent>
      </Card>
    </div>
  );
}
