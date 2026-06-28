'use client';

import useSWR from 'swr';
import { useState } from 'react';
import ComplianceCalendar from '@/components/sostenibilidad/compliance-calendar';
import AuditModal from '@/components/sostenibilidad/audit-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function CompliancePage() {
  const [auditOpen, setAuditOpen] = useState(false);
  const { data: auditData, mutate } = useSWR('/api/sostenibilidad/audit-sessions', fetcher);
  const { data: scoreData } = useSWR('/api/sostenibilidad/compliance/calculate-score', fetcher);
  const { data: eventsData } = useSWR('/api/sostenibilidad/compliance-events?limit=12', fetcher);
  const audits = Array.isArray(auditData?.data) ? auditData.data : [];
  const events = Array.isArray(eventsData?.data) ? eventsData.data : [];
  const score = scoreData || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de cumplimiento</h1>
          <p className="text-muted-foreground">ISO 45001 y SERNAGEOMIN</p>
        </div>
        <Button onClick={() => setAuditOpen(true)}>Iniciar auditoría</Button>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
          <TabsTrigger value="audits">Historial</TabsTrigger>
          <TabsTrigger value="checklists">Listas</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <ComplianceCalendar />
        </TabsContent>

        <TabsContent value="audits">
          <div className="grid gap-4 md:grid-cols-2">
            {audits.length > 0 ? (
              audits.map((audit: any) => (
                <Card key={audit.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{audit.audit_name || 'Auditoría sin nombre'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>Categoría: {audit.category || 'ISO'}</p>
                    <p>Estado: {audit.compliance_status || 'in_progress'}</p>
                    <p>Auditor: {audit.auditor || 'Por asignar'}</p>
                    <p>Evidencias: {audit.evidence_count || 0}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No hay auditorías registradas aún.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="checklists">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Indicadores de cumplimiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Score actual: {score.compliance_score ?? 0}%</p>
                <p>No conformidades abiertas: {score.open_ncs ?? 0}</p>
                <p>No conformidades vencidas: {score.overdue_cas ?? 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Eventos próximos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {events.slice(0, 4).length > 0 ? (
                  events.slice(0, 4).map((event: any) => (
                    <div key={event.id} className="rounded-md border border-border p-2">
                      <p className="font-medium text-foreground">{event.title || event.titulo}</p>
                      <p>{event.due_date || event.fecha_inicio || 'Sin fecha'}</p>
                    </div>
                  ))
                ) : (
                  <p>No hay eventos programados.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{score.compliance_score ?? 0}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">NC abiertas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{score.open_ncs ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">NC cerradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{score.closed_ncs ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Eventos vencidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{score.overdue_cas ?? 0}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AuditModal
        open={auditOpen}
        onOpenChange={(open) => {
          setAuditOpen(open);
          if (!open) void mutate();
        }}
      />
    </div>
  );
}
