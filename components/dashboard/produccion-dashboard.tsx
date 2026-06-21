import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductionKPI } from '@/hooks/use-module-apis';
import { LineChart, Line, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function ProduccionDashboard() {
  const { kpis, isLoading, error, mutate } = useProductionKPI();

  if (error) return <div className="text-red-500">Error al cargar datos de producción</div>;
  if (isLoading) return <div>Cargando...</div>;

  const latestKPI = kpis[0] || {};
  const avgProduction = (kpis.reduce((sum, k) => sum + (k.production_tons || 0), 0) / kpis.length).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Producción en tiempo real</h1>
          <p className="text-muted-foreground">Monitoreo integral de KPIs operacionales</p>
        </div>
        <Button size="sm" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Producción de hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestKPI.production_tons?.toFixed(0) || 0} ton</div>
            <p className="text-xs text-muted-foreground">Promedio: {avgProduction} ton</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Disponibilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestKPI.equipment_uptime?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">Equipos operativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Incidentes hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{latestKPI.safety_incidents || 0}</div>
            <p className="text-xs text-muted-foreground">Seguridad</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cumplimiento ambiental</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestKPI.environmental_compliance?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">Estándares</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Producción - Últimos 30 días</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={kpis.slice().reverse()}>
              <CartesianGrid />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="production_tons" stroke="#ff7300" name="Toneladas" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Métricas operacionales</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={kpis.slice().reverse()}>
              <CartesianGrid />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="equipment_uptime" fill="#82ca9d" name="Uptime %" />
              <Bar dataKey="workforce_efficiency" fill="#ffc658" name="Eficiencia %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
