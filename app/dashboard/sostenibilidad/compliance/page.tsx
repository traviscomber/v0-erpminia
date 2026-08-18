'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, CalendarClock, ClipboardCheck, FileCheck2, Upload } from 'lucide-react';
import AuditModal from '@/components/sostenibilidad/audit-modal';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar cumplimiento');
  return payload;
};

type AuditItem = {
  id: string;
  audit_name?: string;
  category?: string;
  compliance_status?: string;
  auditor?: string;
  evidence_count?: number;
};

type EventItem = {
  id: string;
  title?: string;
  titulo?: string;
  due_date?: string;
  fecha_inicio?: string;
};

function listFrom(payload: any) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

export default function CompliancePage() {
  const [auditOpen, setAuditOpen] = useState(false);
  const { data: auditData, error: auditError, isLoading: auditsLoading, mutate } = useSWR('/api/sostenibilidad/audit-sessions', fetcher);
  const { data: scoreData, error: scoreError, isLoading: scoreLoading } = useSWR('/api/sostenibilidad/compliance/calculate-score', fetcher);
  const { data: eventsData, error: eventsError, isLoading: eventsLoading } = useSWR('/api/sostenibilidad/compliance-events?limit=12', fetcher);

  const audits = listFrom(auditData) as AuditItem[];
  const events = listFrom(eventsData) as EventItem[];
  const score = scoreData || {};
  const complianceScore = typeof score.compliance_score === 'number' ? score.compliance_score : 0;
  const openNonconformities = typeof score.open_ncs === 'number' ? score.open_ncs : 0;
  const overdueActions = typeof score.overdue_cas === 'number' ? score.overdue_cas : 0;
  const loading = auditsLoading || scoreLoading || eventsLoading;
  const hasError = Boolean(auditError || scoreError || eventsError);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sostenibilidad · Cumplimiento</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Cumplimiento Minero</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Fiscalizaciones, obligaciones, vencimientos y preparación de antecedentes para Sernageomin desde una sola vista.</p>
        </div>
        <Button onClick={() => setAuditOpen(true)}>Registrar fiscalización</Button>
      </header>

      {hasError ? <StatePanel tone="warning" title="Hay información de cumplimiento no disponible" description="Se mantiene visible la evidencia que sí pudo validarse." /> : null}

      <section aria-label="Estado de cumplimiento" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
        {[
          ['Cumplimiento', `${complianceScore}%`],
          ['No conformidades abiertas', openNonconformities],
          ['Acciones vencidas', overdueActions],
        ].map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{loading ? '—' : value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Fiscalizaciones y auditorías</h2>
            <p className="text-sm text-muted-foreground">Registro de revisiones, responsables y evidencia asociada.</p>
          </div>
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
        </div>
        {auditsLoading ? (
          <StatePanel tone="loading" title="Cargando fiscalizaciones" />
        ) : audits.length === 0 ? (
          <StatePanel title="Sin fiscalizaciones registradas" description="Registra la primera revisión cuando exista evidencia real." />
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            {audits.slice(0, 8).map((audit) => (
              <div key={audit.id} className="grid gap-1 border-b px-4 py-3 last:border-0 sm:grid-cols-[1fr_160px_120px] sm:items-center sm:gap-4">
                <div>
                  <p className="text-sm font-medium">{audit.audit_name || 'Fiscalización sin nombre'}</p>
                  <p className="text-xs text-muted-foreground">{audit.category || 'Cumplimiento'} · {audit.auditor || 'Responsable por asignar'}</p>
                </div>
                <span className="text-sm text-muted-foreground">{audit.compliance_status || 'En revisión'}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{audit.evidence_count || 0} evidencias</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Obligaciones y vencimientos</h2>
            <p className="text-sm text-muted-foreground">Compromisos regulatorios y fechas que requieren seguimiento.</p>
          </div>
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
        </div>
        {eventsLoading ? (
          <StatePanel tone="loading" title="Cargando obligaciones" />
        ) : events.length === 0 ? (
          <StatePanel title="Sin obligaciones programadas" description="No se registran eventos de cumplimiento con fecha en esta fuente." />
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            {events.slice(0, 8).map((event) => (
              <div key={event.id} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
                <FileCheck2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{event.title || event.titulo || 'Obligación sin título'}</span>
                <span className="text-sm text-muted-foreground">{event.due_date || event.fecha_inicio || 'Sin fecha'}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border px-4 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground" /><h2 className="font-semibold">Preparación de declaraciones Sernageomin</h2></div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">MOTIL puede ordenar antecedentes, evidencias y archivos para preparar declaraciones y revisiones. En esta etapa no se declara envío automático a SIMIN ni integración oficial con Sernageomin.</p>
          </div>
          <Button asChild variant="outline"><Link href="/dashboard/sostenibilidad/compliance/importar"><Upload className="mr-2 h-4 w-4" />Importar antecedentes</Link></Button>
        </div>
      </section>

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
