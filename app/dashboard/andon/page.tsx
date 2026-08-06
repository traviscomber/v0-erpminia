'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, Clock3, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AlertItem = {
  id: string;
  title: string;
  description: string;
  severity: string;
  type: string;
  timestamp: string;
  actionUrl: string;
  actionRequired: boolean;
};

type OperationalAlert = {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  source_type: string;
  status: string;
  owner_name: string | null;
  opened_at: string;
  acknowledged_at: string | null;
  contained_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  root_cause: string | null;
  countermeasure: string | null;
  action_url: string | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar las alertas operacionales');
  return payload;
};

function minutesBetween(start: string, end?: string | null) {
  const a = new Date(start).getTime();
  const b = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, Math.round((b - a) / 60000));
}

function statusLabel(status: string) {
  return ({
    abierta: 'Nueva',
    reconocida: 'Asignada',
    en_contencion: 'En control',
    resuelta: 'Resuelta',
    cerrada: 'Cerrada',
  } as Record<string, string>)[status] || status;
}

function sourceLabel(source: string) {
  return ({
    documento: 'Documentos',
    mantenimiento: 'Mantenimiento',
    inventario: 'Inventario',
    sostenibilidad: 'Seguridad',
    contrato: 'Contratos',
    produccion: 'Producción',
    telemetria: 'Monitoreo de equipos',
    otro: 'Otro',
  } as Record<string, string>)[source] || 'Otro';
}

function severityLabel(severity: string) {
  return ({ critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja', info: 'Informativa' } as Record<string, string>)[severity] || severity;
}

export default function AndonPage() {
  const [view, setView] = useState('activas');
  const [selected, setSelected] = useState<OperationalAlert | null>(null);
  const [owner, setOwner] = useState('');
  const [cause, setCause] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [actionError, setActionError] = useState('');
  const [updating, setUpdating] = useState(false);

  const { data: alertsData } = useSWR<{ alerts?: AlertItem[] }>('/api/alertas', fetcher, { revalidateOnFocus: false });
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: OperationalAlert[] }>(
    '/api/lean/andon',
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60000 },
  );

  useEffect(() => {
    const alerts = (alertsData?.alerts || []).filter((item) => item.actionRequired && ['critica', 'alta'].includes(item.severity));
    if (!alerts.length) return;
    void fetch('/api/lean/andon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ alerts }),
    }).then(() => mutate());
  }, [alertsData?.alerts, mutate]);

  const events = useMemo(
    () => (data?.data || []).filter((item) => view === 'todas' || (view === 'activas' ? !['resuelta', 'cerrada'].includes(item.status) : item.status === view)),
    [data?.data, view],
  );
  const all = data?.data || [];
  const openCount = all.filter((item) => !['resuelta', 'cerrada'].includes(item.status)).length;
  const criticalCount = all.filter((item) => item.severity === 'critica' && !['resuelta', 'cerrada'].includes(item.status)).length;
  const newCount = all.filter((item) => item.status === 'abierta').length;
  const answered = all.filter((item) => item.acknowledged_at);
  const avgResponse = answered.length
    ? Math.round(answered.reduce((sum, item) => sum + minutesBetween(item.opened_at, item.acknowledged_at), 0) / answered.length)
    : 0;

  const updateEvent = async (event: OperationalAlert, patch: Record<string, unknown>) => {
    setUpdating(true);
    setActionError('');
    try {
      const response = await fetch('/api/lean/andon', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: event.id, ...patch }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No fue posible guardar los cambios');
      setSelected(payload.data);
      setOwner(payload.data.owner_name || '');
      setCause(payload.data.root_cause || '');
      setPreventiveAction(payload.data.countermeasure || '');
      await mutate();
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : 'No fue posible guardar los cambios');
    } finally {
      setUpdating(false);
    }
  };

  const openDetail = (event: OperationalAlert) => {
    setSelected(event);
    setOwner(event.owner_name || '');
    setCause(event.root_cause || '');
    setPreventiveAction(event.countermeasure || '');
    setActionError('');
  };

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Control y mejora</PageHeaderEyebrow>
          <PageHeaderTitle>Alertas operacionales</PageHeaderTitle>
          <PageHeaderDescription>
            Problemas que requieren responsable, control, causa principal y una acción para evitar que se repitan.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}>
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />Actualizar
          </Button>
          <Button asChild><Link href="/dashboard/daily-management">Revisión diaria</Link></Button>
        </PageHeaderActions>
      </PageHeader>

      <section className="grid divide-y rounded-lg border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {[
          ['Alertas abiertas', openCount],
          ['Críticas', criticalCount],
          ['Nuevas', newCount],
          ['Tiempo medio de respuesta', `${avgResponse} min`],
        ].map(([label, value]) => (
          <div key={String(label)} className="px-5 py-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </section>

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="activas">Abiertas</TabsTrigger>
          <TabsTrigger value="abierta">Nuevas</TabsTrigger>
          <TabsTrigger value="en_contencion">En control</TabsTrigger>
          <TabsTrigger value="resuelta">Resueltas</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      {actionError ? <StatePanel tone="error" title="No fue posible guardar" description={actionError} className="min-h-0 py-5" /> : null}
      {isLoading ? <StatePanel tone="loading" title="Cargando alertas" description="Revisando los problemas que requieren atención." /> : null}
      {error ? <StatePanel tone="error" title="No fue posible cargar las alertas" description={error.message} /> : null}
      {!isLoading && !error && events.length === 0 ? (
        <StatePanel tone="success" icon={ShieldCheck} title="Sin alertas en esta vista" description="No hay problemas que coincidan con el filtro seleccionado." />
      ) : null}

      {!isLoading && !error && events.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="divide-y">
            {events.map((event) => (
              <article key={event.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={event.severity === 'critica' ? 'destructive' : 'default'}>{severityLabel(event.severity)}</Badge>
                    <Badge variant="outline">{sourceLabel(event.source_type)}</Badge>
                    <Badge variant="outline">{statusLabel(event.status)}</Badge>
                  </div>
                  <h2 className="mt-2 text-sm font-semibold">{event.title}</h2>
                  {event.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.description}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{minutesBetween(event.opened_at)} min sin cerrar</span>
                    <span>{event.owner_name || 'Sin responsable'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {event.status === 'abierta' ? (
                    <Button size="sm" disabled={updating} onClick={() => void updateEvent(event, { status: 'reconocida' })}>Tomar a cargo</Button>
                  ) : null}
                  {['abierta', 'reconocida'].includes(event.status) ? (
                    <Button size="sm" variant="outline" disabled={updating} onClick={() => void updateEvent(event, { status: 'en_contencion' })}>Iniciar control</Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => openDetail(event)}>Revisar<ArrowRight className="h-4 w-4" /></Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {selected ? (
        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Seguimiento del problema</p>
              <h2 className="mt-1 text-base font-semibold">{selected.title}</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Cerrar panel</Button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <label className="text-xs font-medium">Responsable</label>
              <Input className="mt-2" value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Nombre del responsable" />
            </div>
            <div>
              <label className="text-xs font-medium">Estado actual</label>
              <div className="mt-2 flex h-10 items-center rounded-md border px-3 text-sm">{statusLabel(selected.status)}</div>
            </div>
            <div>
              <label className="text-xs font-medium">Causa principal</label>
              <Textarea className="mt-2 min-h-28" value={cause} onChange={(event) => setCause(event.target.value)} placeholder="Qué originó el problema" />
            </div>
            <div>
              <label className="text-xs font-medium">Acción preventiva</label>
              <Textarea className="mt-2 min-h-28" value={preventiveAction} onChange={(event) => setPreventiveAction(event.target.value)} placeholder="Qué se hará para evitar que vuelva a ocurrir" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {selected.action_url ? (
              <Button asChild variant="outline"><Link href={selected.action_url}>Abrir registro original</Link></Button>
            ) : null}
            <Button
              variant="outline"
              disabled={updating}
              onClick={() => void updateEvent(selected, { owner_name: owner, root_cause: cause, countermeasure: preventiveAction })}
            >
              Guardar
            </Button>
            {!['resuelta', 'cerrada'].includes(selected.status) ? (
              <Button
                disabled={updating || !owner.trim() || !cause.trim() || !preventiveAction.trim()}
                onClick={() => void updateEvent(selected, {
                  status: 'resuelta',
                  owner_name: owner,
                  root_cause: cause,
                  countermeasure: preventiveAction,
                })}
              >
                <AlertTriangle className="h-4 w-4" />Marcar como resuelta
              </Button>
            ) : null}
            {selected.status === 'resuelta' ? (
              <Button
                disabled={updating}
                onClick={() => void updateEvent(selected, {
                  status: 'cerrada',
                  owner_name: owner,
                  root_cause: cause,
                  countermeasure: preventiveAction,
                })}
              >
                Cerrar seguimiento
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
