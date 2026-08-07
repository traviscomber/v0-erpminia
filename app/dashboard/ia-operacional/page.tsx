'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, RefreshCw, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Decision = {
  id: string;
  category: 'maintenance' | 'preventive' | 'inventory' | 'documents' | 'finance';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  responsibleArea: string;
  dueDate: string | null;
  amount: number | null;
  href: string;
  sourceId: string;
};

type DecisionResponse = {
  summary?: {
    totalDecisions?: number;
    critical?: number;
    warning?: number;
    overdueWorkOrders?: number;
    preventiveDue?: number;
    lowStock?: number;
    documentsAtRisk?: number;
    financialPendingAmount?: number;
  };
  decisions?: Decision[];
  weeklyActivity?: {
    openedWorkOrders?: { current?: number; previous?: number };
    completedWorkOrders?: { current?: number; previous?: number };
  };
  generatedAt?: string;
  source?: string;
  error?: string;
};

const fetcher = async (url: string): Promise<DecisionResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el centro ejecutivo');
  return payload || {};
};

const categoryLabels: Record<Decision['category'], string> = {
  maintenance: 'Mantenimiento',
  preventive: 'Preventivo',
  inventory: 'Inventario',
  documents: 'Documentos',
  finance: 'Finanzas',
};

const severityLabels: Record<Decision['severity'], string> = {
  critical: 'Crítica',
  warning: 'Atención',
  info: 'Seguimiento',
};

function formatMoney(value?: number | null) {
  if (!value) return null;
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function activityDelta(current = 0, previous = 0) {
  const delta = current - previous;
  if (delta === 0) return 'Sin cambio vs. 7 días anteriores';
  return `${delta > 0 ? '+' : ''}${delta} vs. 7 días anteriores`;
}

export default function IAOperacionalPage() {
  const { data, error, isLoading, mutate } = useSWR<DecisionResponse>('/api/dashboard/ia-operacional', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 60000,
  });

  const summary = data?.summary || {};
  const decisions = Array.isArray(data?.decisions) ? data.decisions : [];
  const opened = data?.weeklyActivity?.openedWorkOrders || {};
  const completed = data?.weeklyActivity?.completedWorkOrders || {};

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Control y mejora · Información canónica</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Centro ejecutivo de decisiones</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Excepciones operacionales que requieren decisión o seguimiento, construidas únicamente desde registros vigentes del sistema.
          </p>
        </div>
        <Button variant="outline" onClick={() => void mutate()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
        </Button>
      </section>

      {error ? (
        <Card className="border-destructive/30 shadow-none">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
            <p className="mt-3 font-medium">No se pudo cargar el centro ejecutivo</p>
            <p className="mt-1 text-sm text-muted-foreground">No se muestran cifras parciales ni estimadas.</p>
            <Button className="mt-4" variant="outline" onClick={() => void mutate()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="shadow-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Decisiones abiertas</p>
                <p className="mt-1 text-2xl font-semibold">{Number(summary.totalDecisions || 0)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Críticas</p>
                <p className="mt-1 text-2xl font-semibold text-destructive">{Number(summary.critical || 0)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">OT vencidas</p>
                <p className="mt-1 text-2xl font-semibold">{Number(summary.overdueWorkOrders || 0)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Monto financiero vencido</p>
                <p className="mt-1 text-xl font-semibold">{formatMoney(Number(summary.financialPendingAmount || 0)) || '$0'}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="shadow-none">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">Decisiones requeridas</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Ordenadas por severidad y fecha registrada.</p>
                </div>
                {Number(summary.critical || 0) > 0 && <Badge variant="destructive">Prioridad ejecutiva</Badge>}
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-3 p-5">
                    {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />)}
                  </div>
                ) : decisions.length === 0 ? (
                  <div className="p-10 text-center">
                    <CheckCircle2 className="mx-auto h-7 w-7 text-muted-foreground" />
                    <p className="mt-3 font-medium">No hay excepciones abiertas</p>
                    <p className="mt-1 text-sm text-muted-foreground">Los registros consultados no requieren una decisión ejecutiva en este momento.</p>
                  </div>
                ) : (
                  <div className="divide-y border-t">
                    {decisions.map((decision) => (
                      <div key={decision.id} className="grid gap-4 p-4 transition-colors hover:bg-muted/30 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={decision.severity === 'critical' ? 'destructive' : 'outline'}>{severityLabels[decision.severity]}</Badge>
                            <Badge variant="secondary">{categoryLabels[decision.category]}</Badge>
                          </div>
                          <p className="mt-2 font-medium">{decision.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{decision.description}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-xs text-muted-foreground">Responsable</p>
                          <p className="mt-1 font-medium">{decision.responsibleArea}</p>
                          {decision.dueDate && <p className="mt-1 text-xs text-muted-foreground">Fecha: {formatDate(decision.dueDate)}</p>}
                          {decision.amount ? <p className="mt-1 text-xs text-muted-foreground">Monto: {formatMoney(decision.amount)}</p> : null}
                        </div>
                        <Button asChild size="sm" variant={decision.severity === 'critical' ? 'default' : 'outline'}>
                          <Link href={decision.href}>Resolver <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="shadow-none">
                <CardHeader><CardTitle className="text-base">Carga actual</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Preventivos por gestionar</span><strong>{Number(summary.preventiveDue || 0)}</strong></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Stock bajo</span><strong>{Number(summary.lowStock || 0)}</strong></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Documentos en riesgo</span><strong>{Number(summary.documentsAtRisk || 0)}</strong></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Atenciones no críticas</span><strong>{Number(summary.warning || 0)}</strong></div>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4" /> Actividad últimos 7 días</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="text-xs text-muted-foreground">OT abiertas</p>
                    <p className="mt-1 text-2xl font-semibold">{Number(opened.current || 0)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{activityDelta(Number(opened.current || 0), Number(opened.previous || 0))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">OT completadas</p>
                    <p className="mt-1 text-2xl font-semibold">{Number(completed.current || 0)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{activityDelta(Number(completed.current || 0), Number(completed.previous || 0))}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed shadow-none">
                <CardContent className="p-4 text-xs text-muted-foreground">
                  Este centro no calcula índices de “salud”, eficiencia artificial ni predicciones. Cada cifra corresponde a un registro o a un conteo directo de registros canónicos.
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
