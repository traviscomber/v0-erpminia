'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, Boxes, CalendarClock, Factory, RefreshCw, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type PlanningResponse = {
  planner?: { name: string; role: string; scope: string[] };
  summary?: {
    active_alerts: number;
    critical_alerts: number;
    warning_alerts: number;
    material_blockers: number;
    maintenance_alerts: number;
    max_priority: number | null;
  } | null;
  attention?: Array<{
    domain: string | null;
    alert_key: string;
    severity: string | null;
    priority_score: number | null;
    title: string;
    evidence_summary: string | null;
    status: string | null;
    affects_operation: boolean | null;
    material_related: boolean | null;
    occurred_at: string | null;
    recommended_action: string | null;
    action_url: string;
  }>;
  preventive?: Array<{
    schedule_id: string;
    canonical_asset_id: string | null;
    asset_code: string | null;
    asset_name: string | null;
    task_name: string | null;
    due_meter: number | null;
    effective_current_meter: number | null;
    remaining_hours: number | null;
    hour_status: string | null;
    alert_due: boolean | null;
    meter_basis_conflict: boolean | null;
  }>;
  productionPlan?: {
    id: string;
    plan_code: string;
    period_start: string;
    period_end: string;
    status: string;
    prepared_by: string | null;
    total_mineral_to_plant_tons: number | null;
    total_waste_tons: number | null;
    total_movement_tons: number | null;
    planned_advance_m: number | null;
    planned_drilling_m: number | null;
  } | null;
  sourceStatus?: {
    attention: { available: boolean };
    preventive: { available: boolean };
    productionPlan: { available: boolean };
    complete: boolean;
  };
  generatedAt?: string;
};

const fetcher = async (url: string): Promise<PlanningResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar el centro de planificación');
  return payload || {};
};

function domainLabel(domain: string | null) {
  const value = String(domain || '').toLowerCase();
  if (value.includes('maintenance')) return 'Mantenimiento';
  if (value.includes('inventory') || value.includes('warehouse') || value.includes('material')) return 'Bodega';
  if (value.includes('purchase') || value.includes('procurement')) return 'Compras';
  if (value.includes('production') || value.includes('drilling')) return 'Producción';
  return 'Transversal';
}

function severityLabel(value: string | null) {
  const severity = String(value || '').toLowerCase();
  if (severity === 'critical') return 'Crítica';
  if (severity === 'warning') return 'Advertencia';
  return value || 'Informativa';
}

function number(value: number | null | undefined, suffix = '') {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(Number(value))}${suffix}`;
}

export default function PlanificacionPage() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<PlanningResponse>('/api/planificacion', fetcher, {
    revalidateOnFocus: false,
  });

  const attention = data?.attention ?? [];
  const preventive = data?.preventive ?? [];
  const plan = data?.productionPlan ?? null;
  const summary = data?.summary ?? null;
  const complete = data?.sourceStatus?.complete === true;

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Planning Intelligence · Jefe de Planificación</PageHeaderEyebrow>
          <PageHeaderTitle>Centro de planificación</PageHeaderTitle>
          <PageHeaderDescription>
            Una cola transversal para coordinar mantenimiento, producción, bodega y compras. MOTIL calcula y ordena señales; Ariel confirma prioridades, ventanas y decisiones.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}>
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {!complete && data?.sourceStatus ? (
        <StatePanel
          tone="warning"
          title="Vista parcial de planificación"
          description="Una o más fuentes canónicas no respondieron. MOTIL mantiene visibles los datos disponibles y no interpreta la ausencia como cero."
          className="min-h-0"
        />
      ) : null}

      <section className="grid divide-y rounded-lg border border-border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0" aria-label="Resumen de planificación">
        {[
          ['Atención activa', summary ? summary.active_alerts : '—', 'Señales pendientes'],
          ['Críticas', summary ? summary.critical_alerts : '—', 'Requieren revisión primero'],
          ['Bloqueos materiales', summary ? summary.material_blockers : '—', 'Dependencias de abastecimiento'],
          ['Preventivos alertados', preventive.length, complete ? 'Por condición horaria' : 'Entre fuentes disponibles'],
        ].map(([label, value, detail]) => (
          <div key={String(label)} className="px-5 py-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{String(value)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </section>

      {isLoading ? <StatePanel tone="loading" title="Construyendo la vista de planificación" description="Consultando atención operacional, mantenimiento preventivo y programa de producción." /> : null}
      {error ? <StatePanel tone="error" title="No fue posible cargar planificación" description={error.message} actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} /> : null}

      {!isLoading && !error ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">01 · Attention</p>
              <h2 className="mt-1 text-lg font-semibold">Qué requiere decisión de planificación</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ordenado por prioridad operacional. La recomendación no ejecuta cambios por sí sola.</p>
            </div>

            {attention.length === 0 ? (
              <StatePanel tone="neutral" title="Sin señales pendientes en la fuente disponible" description="No se generan decisiones automáticas por ausencia de señales." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="divide-y divide-border">
                  {attention.map((item) => (
                    <article key={item.alert_key} className="grid gap-4 px-4 py-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:px-5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        {item.material_related ? <Boxes className="h-4 w-4 text-muted-foreground" /> : item.domain?.includes('maintenance') ? <Wrench className="h-4 w-4 text-muted-foreground" /> : <AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">{item.title}</h3>
                          <Badge variant={item.severity === 'critical' ? 'destructive' : 'outline'}>{severityLabel(item.severity)}</Badge>
                          <Badge variant="outline">{domainLabel(item.domain)}</Badge>
                          {item.priority_score != null ? <span className="text-xs text-muted-foreground">Prioridad {item.priority_score}</span> : null}
                        </div>
                        {item.evidence_summary ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.evidence_summary}</p> : null}
                        {item.recommended_action ? <p className="mt-2 text-xs text-muted-foreground">Siguiente acción sugerida: <span className="font-medium text-foreground">{item.recommended_action.replaceAll('_', ' ')}</span></p> : null}
                      </div>
                      <Button size="sm" variant="outline" asChild><Link href={item.action_url}>Abrir fuente</Link></Button>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">02 · Producción</p>
                  <h2 className="mt-1 text-base font-semibold">Plan activo</h2>
                </div>
                <Factory className="h-4 w-4 text-muted-foreground" />
              </div>
              {plan ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold">{plan.plan_code}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.period_start} → {plan.period_end}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div><dt className="text-xs text-muted-foreground">Movimiento</dt><dd className="mt-1 font-medium">{number(plan.total_movement_tons, ' t')}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Mineral planta</dt><dd className="mt-1 font-medium">{number(plan.total_mineral_to_plant_tons, ' t')}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Avance</dt><dd className="mt-1 font-medium">{number(plan.planned_advance_m, ' m')}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Sondaje</dt><dd className="mt-1 font-medium">{number(plan.planned_drilling_m, ' m')}</dd></div>
                  </dl>
                  <Button variant="outline" size="sm" asChild><Link href="/dashboard/produccion">Abrir Producción</Link></Button>
                </div>
              ) : <p className="mt-4 text-sm text-muted-foreground">No existe un plan de producción activo en la fuente canónica.</p>}
            </section>

            <section className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">03 · Mantenimiento</p>
                  <h2 className="mt-1 text-base font-semibold">Ventanas por horómetro</h2>
                </div>
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-4 space-y-3">
                {preventive.slice(0, 6).map((item) => (
                  <div key={item.schedule_id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{item.asset_code || item.asset_name || 'Equipo'}</p>
                      <Badge variant={item.remaining_hours != null && item.remaining_hours <= 0 ? 'destructive' : 'outline'}>{number(item.remaining_hours, ' h')}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.task_name || 'Mantenimiento preventivo'}</p>
                    {item.meter_basis_conflict ? <p className="mt-1 text-xs text-destructive">Lectura con conflicto de base: requiere revisión humana.</p> : null}
                  </div>
                ))}
                {preventive.length === 0 ? <p className="text-sm text-muted-foreground">Sin preventivos alertados en la fuente disponible.</p> : null}
              </div>
              <Button className="mt-4" variant="outline" size="sm" asChild><Link href="/dashboard/mantenimiento/planificacion">Abrir planificación de mantenimiento</Link></Button>
            </section>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
