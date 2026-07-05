'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { Download, Upload } from 'lucide-react';
import ComplianceCalendar from '@/components/sostenibilidad/compliance-calendar';
import AuditModal from '@/components/sostenibilidad/audit-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return null;
  }

  return payload;
};

type ListResponse<T = unknown> = {
  data?: T[];
  items?: T[];
  total?: number;
  count?: number;
};

type AuditItem = {
  id: string;
  audit_name?: string;
  category?: string;
  compliance_status?: string;
  auditor?: string;
  evidence_count?: number;
  status?: string;
  progress?: number;
  created_at?: string;
  due_date?: string;
  [key: string]: unknown;
};

type EventItem = {
  id: string;
  title?: string;
  titulo?: string;
  due_date?: string;
  fecha_inicio?: string;
  [key: string]: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toAuditItem = (value: unknown): AuditItem | null => {
  if (!isRecord(value) || !value.id) return null;
  return {
    id: String(value.id),
    audit_name: typeof value.audit_name === 'string' ? value.audit_name : undefined,
    category: typeof value.category === 'string' ? value.category : undefined,
    compliance_status: typeof value.compliance_status === 'string' ? value.compliance_status : undefined,
    auditor: typeof value.auditor === 'string' ? value.auditor : undefined,
    evidence_count: typeof value.evidence_count === 'number' ? value.evidence_count : undefined,
    status: typeof value.status === 'string' ? value.status : undefined,
    progress: typeof value.progress === 'number' ? value.progress : undefined,
    created_at: typeof value.created_at === 'string' ? value.created_at : undefined,
    due_date: typeof value.due_date === 'string' ? value.due_date : undefined,
    ...value,
  };
};

const toEventItem = (value: unknown): EventItem | null => {
  if (!isRecord(value) || !value.id) return null;
  return {
    id: String(value.id),
    title: typeof value.title === 'string' ? value.title : undefined,
    titulo: typeof value.titulo === 'string' ? value.titulo : undefined,
    due_date: typeof value.due_date === 'string' ? value.due_date : undefined,
    fecha_inicio: typeof value.fecha_inicio === 'string' ? value.fecha_inicio : undefined,
    ...value,
  };
};

export default function CompliancePage() {
  const [auditOpen, setAuditOpen] = useState(false);
  const { data: auditData, mutate } = useSWR<ListResponse<unknown> | null>('/api/sostenibilidad/audit-sessions', fetcher);
  const { data: scoreData } = useSWR<Record<string, unknown> | null>('/api/sostenibilidad/compliance/calculate-score', fetcher);
  const { data: eventsData } = useSWR<ListResponse<unknown> | null>('/api/sostenibilidad/compliance-events?limit=12', fetcher);

  const audits = Array.isArray(auditData?.data)
    ? auditData.data.map(toAuditItem).filter((audit): audit is AuditItem => audit !== null)
    : [];
  const events = Array.isArray(eventsData?.data)
    ? eventsData.data.map(toEventItem).filter((event): event is EventItem => event !== null)
    : [];
  const score = scoreData && typeof scoreData === 'object' ? scoreData : {};
  const complianceScore = typeof score.compliance_score === 'number' ? score.compliance_score : 0;
  const openNonconformities = typeof score.open_ncs === 'number' ? score.open_ncs : 0;
  const overdueNonconformities = typeof score.overdue_cas === 'number' ? score.overdue_cas : 0;
  const closedNonconformities = typeof score.closed_ncs === 'number' ? score.closed_ncs : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion de cumplimiento</h1>
          <p className="text-muted-foreground">ISO 45001 y SERNAGEOMIN</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/compliance/importar">
              <Download className="mr-2 h-4 w-4" />
              Plantilla
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/sostenibilidad/compliance/importar">
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button onClick={() => setAuditOpen(true)}>Iniciar auditoria</Button>
        </div>
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
              audits.map((audit) => (
                <Card key={audit.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{audit.audit_name || 'Auditoria sin nombre'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>Categoria: {audit.category || 'ISO'}</p>
                    <p>Estado: {audit.compliance_status || 'in_progress'}</p>
                    <p>Auditor: {audit.auditor || 'Por asignar'}</p>
                    <p>Evidencias: {audit.evidence_count || 0}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No hay auditorias registradas aun.
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
                <p>Score actual: {complianceScore}%</p>
                <p>No conformidades abiertas: {openNonconformities}</p>
                <p>No conformidades vencidas: {overdueNonconformities}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Eventos proximos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {events.slice(0, 4).length > 0 ? (
                  events.slice(0, 4).map((event) => (
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
                <div className="text-3xl font-bold">{complianceScore}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">NC abiertas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{openNonconformities}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">NC cerradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{closedNonconformities}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Eventos vencidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{overdueNonconformities}</div>
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
