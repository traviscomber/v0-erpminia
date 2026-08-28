'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Activity, AlertTriangle, ArrowRight, FileText, Gauge, GitBranch, QrCode, RefreshCw, Timer, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

type Asset360Response = {
  asset?: { id: string; asset_code?: string | null; name?: string | null; asset_type?: string | null; category?: string | null; manufacturer?: string | null; model?: string | null; serial_number?: string | null; license_plate?: string | null; cost_center_code?: string | null; is_active?: boolean | null; validation_status?: string | null };
  summary?: { activeWorkOrders: number; criticalOpen: number; operationalBlockers: number; readyToClose: number; pendingPlanSteps: number; overduePreventives: number };
  runtime?: { reading_count?: number; last_reading_at?: string | null; latest_meter_hours?: number | string | null; observed_operating_hours?: number | string | null; reset_count?: number; usable_for_rate_metrics?: boolean } | null;
  reliability?: { audited_closures?: number; recurring_cause_count?: number; max_same_cause_occurrences?: number; audited_total_cost?: number | string | null; audited_avg_cost?: number | string | null; total_downtime_hours?: number | string | null; avg_days_between_audited_interventions?: number | string | null; has_recurring_root_cause?: boolean; last_audited_closure_at?: string | null } | null;
  runtimeReliability?: { audited_corrective_events?: number; corrective_events_with_meter?: number; valid_mtbf_intervals?: number; mtbf_operating_hours?: number | string | null; mttr_hours?: number | string | null; meter_event_coverage_percent?: number | string | null } | null;
  nextPreventive?: { schedule_id: string; task_name?: string | null; frequency_hours?: number | string | null; due_meter?: number | string | null; effective_current_meter?: number | string | null; hour_status?: string | null; remaining_hours?: number | string | null; alert_due?: boolean; generated_work_order_id?: string | null } | null;
  closeReadiness?: Array<{ work_order_id: string; work_order_number?: string | null; next_action?: string | null; ready_to_close?: boolean; standard_plan_steps_pending?: number | string | null }>;
};

const fetcher = async (url: string): Promise<Asset360Response> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la ficha 360 operacional');
  return payload;
};

const number = (value: unknown, digits = 0) => Number(value || 0).toLocaleString('es-CL', { maximumFractionDigits: digits });
const money = (value: unknown) => `$${Number(value || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;

export function Asset360Overview({ assetId, scope = 'equipos' }: { assetId: string; scope?: 'equipos' | 'vehiculos' }) {
  const { data, error, isLoading, mutate } = useSWR<Asset360Response>(assetId ? `/api/maintenance/assets/${encodeURIComponent(assetId)}/operational-360` : null, fetcher, { revalidateOnFocus: false });
  const noun = scope === 'vehiculos' ? 'Vehículo' : 'Equipo';
  const basePath = `/dashboard/mantenimiento/${scope}/${encodeURIComponent(assetId)}`;

  if (isLoading) return <StatePanel tone="loading" title={`Preparando ${noun} 360°`} description="Reuniendo OT, preventivos, horómetro, costos auditados y confiabilidad." />;
  if (error || !data?.asset) return <StatePanel tone="error" title={`No fue posible preparar ${noun} 360°`} description={error instanceof Error ? error.message : 'No se encontró el activo solicitado.'} actions={<Button variant="outline" onClick={() => void mutate()}><RefreshCw className="h-4 w-4" />Reintentar</Button>} />;

  const summary = data.summary || { activeWorkOrders: 0, criticalOpen: 0, operationalBlockers: 0, readyToClose: 0, pendingPlanSteps: 0, overduePreventives: 0 };
  const runtime = data.runtime;
  const reliability = data.reliability;
  const rr = data.runtimeReliability;
  const nextPreventive = data.nextPreventive;
  const mtbf = Number(rr?.valid_mtbf_intervals || 0) > 0 ? `${number(rr?.mtbf_operating_hours, 1)} h` : 'Sin base';
  const mttr = Number(rr?.audited_corrective_events || 0) > 0 && Number(rr?.mttr_hours || 0) > 0 ? `${number(rr?.mttr_hours, 1)} h` : 'Sin base';
  const auditedCost = Number(reliability?.audited_closures || 0) > 0 ? money(reliability?.audited_total_cost) : 'Sin base';

  const links = [
    { href: `${basePath}/ficha-tecnica`, label: 'Ficha técnica', icon: Gauge },
    { href: `${basePath}/arbol`, label: 'Árbol de fallas', icon: GitBranch },
    { href: `${basePath}/documentos`, label: 'Documentos', icon: FileText },
    { href: `${basePath}/qr`, label: 'Código QR', icon: QrCode },
  ];

  return <div className="space-y-5">
    <Card className="shadow-none">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{noun} 360° operacional</p>
          <CardTitle className="mt-1 text-2xl">{data.asset.asset_code || data.asset.name || noun}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{[data.asset.name, data.asset.manufacturer, data.asset.model, data.asset.license_plate, data.asset.serial_number].filter(Boolean).join(' · ') || 'Identificación técnica no informada'}</p>
        </div>
        <div className="flex flex-wrap gap-2"><Badge variant="outline">{data.asset.is_active ? 'Activo' : 'Inactivo'}</Badge>{data.asset.validation_status ? <Badge variant="secondary">{data.asset.validation_status}</Badge> : null}</div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-6">
          {[
            ['OT activas', summary.activeWorkOrders, Wrench],
            ['Preventivos vencidos', summary.overduePreventives, AlertTriangle],
            ['Bloqueos operativos', summary.operationalBlockers, Activity],
            ['Horómetro', runtime?.latest_meter_hours != null ? `${number(runtime.latest_meter_hours, 1)} h` : 'Sin lectura', Gauge],
            ['MTBF real', mtbf, Timer],
            ['Costo auditado', auditedCost, Activity],
          ].map(([label, value, Icon]) => <div key={String(label)} className="bg-card p-4"><div className="flex items-center justify-between gap-2 text-muted-foreground"><span className="text-xs">{String(label)}</span><Icon className="h-4 w-4" /></div><p className="mt-2 text-lg font-semibold">{String(value)}</p></div>)}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border p-4"><p className="text-xs font-medium text-muted-foreground">Próximo preventivo por horas</p>{nextPreventive ? <><p className="mt-2 font-medium">{nextPreventive.task_name || 'Pauta configurada'}</p><p className="mt-1 text-sm text-muted-foreground">Actual {nextPreventive.effective_current_meter == null ? 'sin lectura' : `${number(nextPreventive.effective_current_meter, 1)} h`} · vence {nextPreventive.due_meter == null ? 'sin base' : `${number(nextPreventive.due_meter, 1)} h`}</p><div className="mt-3 flex items-center gap-2"><Badge variant={nextPreventive.alert_due ? 'destructive' : 'outline'}>{nextPreventive.alert_due ? 'Vencido' : nextPreventive.hour_status || 'Pendiente'}</Badge><Button asChild variant="ghost" size="sm"><Link href="/dashboard/mantenimiento/preventivo-horas">Abrir pauta<ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div></> : <p className="mt-2 text-sm text-muted-foreground">No hay pauta horaria configurada para este activo.</p>}</div>

          <div className="rounded-lg border p-4"><p className="text-xs font-medium text-muted-foreground">Confiabilidad auditada</p><div className="mt-2 grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">MTTR</p><p className="font-medium">{mttr}</p></div><div><p className="text-xs text-muted-foreground">Cobertura horómetro</p><p className="font-medium">{Number(rr?.audited_corrective_events || 0) > 0 ? `${number(rr?.meter_event_coverage_percent, 0)}%` : 'Sin base'}</p></div><div><p className="text-xs text-muted-foreground">Cierres auditados</p><p className="font-medium">{Number(reliability?.audited_closures || 0)}</p></div><div><p className="text-xs text-muted-foreground">Causas recurrentes</p><p className="font-medium">{Number(reliability?.recurring_cause_count || 0)}</p></div></div><Button asChild variant="ghost" size="sm" className="mt-3 px-0"><Link href="/dashboard/mantenimiento/confiabilidad">Ver confiabilidad<ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div>

          <div className="rounded-lg border p-4"><p className="text-xs font-medium text-muted-foreground">Cierre y ejecución</p><div className="mt-2 grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">Pasos pendientes</p><p className="font-medium">{summary.pendingPlanSteps}</p></div><div><p className="text-xs text-muted-foreground">Listas para cerrar</p><p className="font-medium">{summary.readyToClose}</p></div><div><p className="text-xs text-muted-foreground">Críticas abiertas</p><p className="font-medium">{summary.criticalOpen}</p></div><div><p className="text-xs text-muted-foreground">Reinicios horómetro</p><p className="font-medium">{Number(runtime?.reset_count || 0)}</p></div></div><Button asChild variant="ghost" size="sm" className="mt-3 px-0"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${encodeURIComponent(data.closeReadiness?.[0]?.work_order_id || '')}`}>Continuar trabajo<ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">MTBF y MTTR sólo aparecen cuando existe evidencia auditada suficiente. El costo corresponde a snapshots de cierre auditado; no se mezcla con el ledger histórico importado.</div>
        <div className="flex flex-wrap gap-2">{links.map(({ href, label, icon: Icon }) => <Button key={href} asChild variant="outline" size="sm"><Link href={href}><Icon className="h-4 w-4" />{label}</Link></Button>)}</div>
      </CardContent>
    </Card>
  </div>;
}
