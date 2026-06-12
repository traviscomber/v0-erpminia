'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import ComplianceCalendar from '@/components/sostenibilidad/compliance-calendar';
import AuditModal from '@/components/sostenibilidad/audit-modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, CheckCircle2, ClipboardList, ShieldAlert, TrendingUp } from 'lucide-react';

type ComplianceEvent = {
  id: string;
  title: string;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue';
  event_type?: string;
  description?: string;
  responsible_person_name?: string;
};

type ScoreResponse = {
  compliance_score?: number;
  total_ncs?: number;
  open_ncs?: number;
  closed_ncs?: number;
  overdue_cas?: number;
  alerts?: Array<{ severity: string; message: string; action_required?: boolean }>;
};

type EventsResponse = {
  data?: ComplianceEvent[];
  stats?: {
    total?: number;
    pending?: number;
    completed?: number;
    overdue?: number;
  };
};

function normalizeStatus(status?: string) {
  const value = String(status || '').toLowerCase();
  if (['completed', 'completado', 'cerrado'].includes(value)) return 'completed';
  if (['overdue', 'vencido'].includes(value)) return 'overdue';
  return 'pending';
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'No se pudo cargar la información');
  return data;
};

const badgeClassByStatus = (status: ComplianceEvent['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-secondary/10 text-secondary border-secondary/30';
    case 'overdue':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    default:
      return 'bg-primary/10 text-primary border-primary/30';
  }
};

export default function CompliancePage() {
  const [auditOpen, setAuditOpen] = useState(false);

  const { data: eventsData } = useSWR<EventsResponse>(
    '/api/sostenibilidad/compliance-events?limit=12',
    fetcher
  );
  const { data: scoreData } = useSWR<ScoreResponse>(
    '/api/sostenibilidad/compliance/calculate-score',
    fetcher
  );

  const events = eventsData?.data || [];
  const stats = eventsData?.stats || { total: 0, pending: 0, completed: 0, overdue: 0 };
  const alerts = scoreData?.alerts || [];

  const overdueCount = useMemo(
    () => events.filter((event) => normalizeStatus(event.status) === 'overdue').length,
    [events]
  );

  const reportRows = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        dueDateLabel: new Date(event.due_date).toLocaleDateString('es-CL'),
      })),
    [events]
  );

  const highPriorityAlerts = alerts.slice(0, 3);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Gestión de compliance</h1>
          <p className="text-muted-foreground max-w-2xl">
            ISO 45001 y SERNAGEOMIN con trazabilidad real de eventos y acciones.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">Eventos: {stats.total || 0}</Badge>
            <Badge className="bg-secondary/10 text-secondary border-secondary/30">
              Score: {scoreData?.compliance_score || 0}%
            </Badge>
            <Badge variant={overdueCount > 0 ? 'destructive' : 'secondary'}>
              Vencidos: {overdueCount || stats.overdue || 0}
            </Badge>
          </div>
        </div>
        <Button onClick={() => setAuditOpen(true)}>
          <ClipboardList className="mr-2 h-4 w-4" />
          Iniciar auditoría
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Score de compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{scoreData?.compliance_score || 0}%</p>
            <p className="text-xs text-muted-foreground">Calculado desde NC y acciones correctivas.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-primary" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.pending || 0}</p>
            <p className="text-xs text-muted-foreground">Eventos próximos o en curso.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-secondary" />
              Completados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-secondary">{stats.completed || 0}</p>
            <p className="text-xs text-muted-foreground">Eventos cerrados con evidencia.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-secondary" />
              Riesgo abierto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{scoreData?.open_ncs || 0}</p>
            <p className="text-xs text-muted-foreground">No conformidades abiertas.</p>
          </CardContent>
        </Card>
      </div>

      {highPriorityAlerts.length > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Alertas de compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {highPriorityAlerts.map((alert, idx) => (
              <div key={`${alert.severity}-${idx}`} className="flex items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 text-primary" />
                <p>{alert.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="audits">Auditoría</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <ComplianceCalendar />
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eventos de compliance</CardTitle>
              <CardDescription>
                Flujo real de auditorías, inspecciones, capacitaciones y reportes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay eventos registrados.</p>
              ) : (
                reportRows.map((event) => (
                  <div key={event.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                    <div className="space-y-1">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.dueDateLabel}
                        {event.responsible_person_name ? ` · ${event.responsible_person_name}` : ''}
                      </p>
                      {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
                    </div>
                    <Badge className={badgeClassByStatus(event.status)}>
                      {event.status === 'completed'
                        ? 'Completado'
                        : event.status === 'overdue'
                          ? 'Vencido'
                          : 'Pendiente'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sesiones de auditoría</CardTitle>
              <CardDescription>
                Registra hallazgos, observaciones y comentarios desde una sesión guiada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Hoy puedes abrir una sesión desde el botón principal y registrar observaciones.
                El siguiente paso del MVP es guardar ese historial para reportes comparativos.
              </p>
              <Button onClick={() => setAuditOpen(true)}>Abrir auditoría</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reporte ejecutivo</CardTitle>
              <CardDescription>Resumen operativo basado en cumplimiento real.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">NC cerradas</p>
                <p className="text-2xl font-bold">{scoreData?.closed_ncs || 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Acciones vencidas</p>
                <p className="text-2xl font-bold text-destructive">{scoreData?.overdue_cas || 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Eventos programados</p>
                <p className="text-2xl font-bold text-primary">{stats.pending || 0}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AuditModal open={auditOpen} onOpenChange={setAuditOpen} />
    </div>
  );
}
