import { IncidentsDashboard } from '@/components/hse/incidents-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Dashboard HSE - Cumplimiento y Seguridad',
  description: 'Ver incidentes, investigaciones y estado de cumplimiento',
};

export default function HSEPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard HSE</h1>
        <p className="text-muted-foreground">Incidentes de seguridad, investigaciones y seguimiento de cumplimiento</p>
      </div>

      <IncidentsDashboard />

      <Card>
        <CardHeader>
          <CardTitle>Estado de Cumplimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Capacitación HSE Vigente</span>
              <span className="text-sm font-semibold">95%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '95%' }}></div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Tiempo de Respuesta a Incidentes (prom)</span>
              <span className="text-sm font-semibold">{'2.3 horas'}</span>
            </div>
            <div className="text-xs text-muted-foreground">{'Meta: <2 horas'}</div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Tasa de Cumplimiento RCA</span>
              <span className="text-sm font-semibold">100%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
