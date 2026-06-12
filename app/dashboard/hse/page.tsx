import { IncidentsDashboard } from '@/components/hse/incidents-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'HSE - Cumplimiento y Seguridad',
  description: 'Ver incidentes, investigaciones y estado de cumplimiento HSE',
};

export default function HSEPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HSE</h1>
        <p className="text-muted-foreground">
          Incidentes de seguridad, investigaciones y seguimiento de cumplimiento
        </p>
      </div>

      <IncidentsDashboard />

      <Card>
        <CardHeader>
          <CardTitle>Estado de Cumplimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Capacitación HSE vigente</span>
              <span className="text-sm font-semibold">95%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-green-600" style={{ width: '95%' }} />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Tiempo de respuesta a incidentes (prom)</span>
              <span className="text-sm font-semibold">2.3 horas</span>
            </div>
            <div className="text-xs text-muted-foreground">Meta: &lt;2 horas</div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Tasa de cumplimiento RCA</span>
              <span className="text-sm font-semibold">100%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-green-600" style={{ width: '100%' }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
