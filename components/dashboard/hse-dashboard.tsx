import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHSEMetrics } from '@/hooks/use-module-apis';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function HSEDashboard() {
  const { metrics, isLoading, error, mutate } = useHSEMetrics();

  if (error) return <div className="text-red-500">Error cargando métricas HSE</div>;
  if (isLoading) return <div>Cargando...</div>;

  const latest = metrics[0] || {};
  const totalTrainingHours = metrics.reduce((sum, m) => sum + (m.training_hours || 0), 0);
  const totalEmployeesTrained = metrics.reduce((sum, m) => sum + (m.employees_trained || 0), 0);
  const avgAuditScore = (metrics.reduce((sum, m) => sum + (m.audit_score || 0), 0) / metrics.length).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">HSE (Salud, Seguridad, Ambiente)</h1>
          <p className="text-muted-foreground">Gestión y cumplimiento normativo</p>
        </div>
        <Button size="sm" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lesiones Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{latest.lost_time_injuries || 0}</div>
            <p className="text-xs text-muted-foreground">Lesiones con tiempo perdido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Casi Accidentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{latest.near_misses || 0}</div>
            <p className="text-xs text-muted-foreground">Near misses identificados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Horas Capacitación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{totalTrainingHours}</div>
            <p className="text-xs text-muted-foreground">Total últimas semanas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Puntaje de auditoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{avgAuditScore}%</div>
            <p className="text-xs text-muted-foreground">Promedio HSE</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendencia de seguridad - Últimos 30 días</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.reverse()}>
              <CartesianGrid />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="lost_time_injuries" stroke="#ef4444" name="Lesiones" />
              <Line type="monotone" dataKey="near_misses" stroke="#f97316" name="Near Misses" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capacitaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.reverse()}>
              <CartesianGrid />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="training_hours" fill="#3b82f6" name="Horas" />
              <Bar dataKey="employees_trained" fill="#22c55e" name="Empleados" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
