'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CheckCircle2, GitBranch, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Severity = 'critical' | 'warning' | 'info';
type Confidence = 'high' | 'medium' | 'low';

type BaseDecision = {
  id: string;
  category: 'maintenance' | 'preventive' | 'inventory' | 'documents' | 'finance';
  severity: Severity;
  title: string;
  description: string;
  responsibleArea: string;
  dueDate: string | null;
  amount: number | null;
  href: string;
  sourceId: string;
};

type ExecutiveResponse = { summary?: any; decisions?: BaseDecision[]; generatedAt?: string };
type HealthStatus = 'healthy' | 'watch' | 'critical' | 'unknown';
type HealthMetric = { label: string; value: string | number | null; ageDays?: number | null };
type HealthDomain = { key: string; label: string; status: HealthStatus; headline: string; metrics: HealthMetric[]; action: string; href: string };
type HealthResponse = { overall: HealthStatus; domains: HealthDomain[]; policy: { freshnessWatchDays: number; freshnessCriticalDays: number }; generatedAt: string };
type MineRow = { key: string; mineName: string; actualTons: number; expectedTonsToCutoff: number; observedVsExpectedPct: number | null; attention: 'alert' | 'watch' | 'ok' | 'no_comparison' };
type ProductionResponse = { mines: MineRow[]; transportThrough: string | null; plantThrough: string | null; drillingFreshness?: { max_date?: string | null } | null };

type RootCauseChain = {
  id: string;
  assetId: string | null;
  assetCode: string | null;
  assetName: string | null;
  equipmentStatus: string | null;
  observation: string | null;
  breakAt: 'work_order' | 'materials' | 'supply_need' | 'procurement_request' | 'purchase_order' | 'receipt' | 'resolved';
  action: string;
  evidenceLevel: 'operational_only' | 'partial' | 'linked';
  workOrder: { id: string; number: string; title: string; status: string; priority: string | null; rootCause: string | null } | null;
  materials: { count: number; shortage: number };
  procurement: { id: string; requestNumber: string; status: string } | null;
  purchaseOrders: Array<{ id: string; number: string; status: string; received: boolean }>;
};
type RootCauseResponse = { chains: RootCauseChain[]; generatedAt: string };

type Decision = {
  id: string;
  category: string;
  severity: Severity;
  title: string;
  description: string;
  responsibleArea: string;
  href: string;
  dueDate?: string | null;
  amount?: number | null;
  confidence: Confidence;
  confidenceReason: string;
  cause?: string;
  breakPoint?: string;
  nextAction?: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la fuente');
  return payload;
};

const severityRank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
const statusConfidence: Record<HealthStatus, Confidence> = { healthy: 'high', watch: 'medium', critical: 'low', unknown: 'low' };
const confidenceLabel: Record<Confidence, string> = { high: 'Confianza alta', medium: 'Con cautela', low: 'Confianza baja' };
const severityLabel: Record<Severity, string> = { critical: 'Crítica', warning: 'Atención', info: 'Seguimiento' };
const breakLabel: Record<RootCauseChain['breakAt'], string> = {
  work_order: 'Falta OT',
  materials: 'Falta evidencia de repuestos',
  supply_need: 'Falta necesidad de abastecimiento',
  procurement_request: 'Falta promoción a Compras',
  purchase_order: 'Falta OC operacional',
  receipt: 'Falta recepción',
  resolved: 'Cadena cerrada',
};

function n(value: number, digits = 0) {
  return Number(value || 0).toLocaleString('es-CL', { maximumFractionDigits: digits });
}

function productionFreshness(domain?: HealthDomain) {
  const transport = domain?.metrics?.find((m) => m.label.startsWith('Transporte'));
  return { status: domain?.status || 'unknown' as HealthStatus, ageDays: transport?.ageDays ?? null };
}

function confidenceReason(domain?: HealthDomain) {
  if (!domain) return 'Sin evaluación de Data Health disponible.';
  if (domain.status === 'healthy') return 'Data Health: fuente dentro de ventana de frescura y sin bloqueo estructural.';
  if (domain.status === 'watch') return `Data Health: usar con cautela. ${domain.headline}`;
  if (domain.status === 'critical') return `Data Health: lectura limitada. ${domain.headline}`;
  return 'Data Health: estado de fuente desconocido.';
}

function rootCauseSeverity(chain: RootCauseChain): Severity {
  const status = String(chain.equipmentStatus || '').toLowerCase();
  const priority = String(chain.workOrder?.priority || '').toLowerCase();
  if (status.includes('fuera de servicio') || priority === 'critical' || priority === 'critica' || priority === 'crítica') return 'critical';
  if (chain.breakAt === 'receipt' || chain.breakAt === 'purchase_order' || chain.breakAt === 'procurement_request') return 'warning';
  return 'warning';
}

export default function DecisionCenterV3() {
  const base = useSWR<ExecutiveResponse>('/api/dashboard/ia-operacional', fetcher, { revalidateOnFocus: false });
  const health = useSWR<HealthResponse>('/api/data-quality/health', fetcher, { revalidateOnFocus: false });
  const production = useSWR<ProductionResponse>('/api/produccion/inteligencia', fetcher, { revalidateOnFocus: false });
  const rootCause = useSWR<RootCauseResponse>('/api/intelligence/root-cause', fetcher, { revalidateOnFocus: false });

  const loading = base.isLoading || health.isLoading || production.isLoading || rootCause.isLoading;
  const error = base.error || health.error || production.error || rootCause.error;
  const domains = health.data?.domains || [];
  const productionHealth = domains.find((d) => d.key === 'production');
  const transportFreshness = productionFreshness(productionHealth);

  const decisions: Decision[] = [];

  for (const item of base.data?.decisions || []) {
    decisions.push({
      ...item,
      category: item.category === 'maintenance' || item.category === 'preventive' ? 'Mantención' : item.category === 'inventory' ? 'Inventario' : item.category === 'documents' ? 'Documentos' : 'Finanzas',
      confidence: 'high',
      confidenceReason: 'Registro canónico vigente del sistema; la decisión no depende de una fuente operacional de Producción atrasada.',
    });
  }

  for (const domain of domains.filter((d) => d.status === 'critical' || d.status === 'watch')) {
    decisions.push({
      id: `data-health-${domain.key}`,
      category: 'Calidad de datos',
      severity: domain.status === 'critical' ? 'critical' : 'warning',
      title: `${domain.label}: ${domain.headline}`,
      description: domain.action,
      responsibleArea: domain.label,
      href: domain.href,
      confidence: 'high',
      confidenceReason: 'La excepción describe la calidad/frescura de la fuente misma; no interpreta desempeño operacional.',
    });
  }

  const prodConfidence = statusConfidence[productionHealth?.status || 'unknown'];
  const prodReason = confidenceReason(productionHealth);
  for (const mine of production.data?.mines || []) {
    if (mine.attention !== 'alert' && mine.attention !== 'watch') continue;
    const gap = Math.max(0, mine.expectedTonsToCutoff - mine.actualTons);
    if (transportFreshness.status === 'critical' || transportFreshness.status === 'unknown') continue;

    const rawSeverity: Severity = mine.attention === 'alert' ? 'critical' : 'warning';
    const severity: Severity = transportFreshness.status === 'watch'
      ? rawSeverity === 'critical' ? 'warning' : 'info'
      : rawSeverity;

    decisions.push({
      id: `production-${mine.key}`,
      category: 'Producción',
      severity,
      title: `${mine.mineName}: ${mine.attention === 'alert' ? 'ritmo bajo' : 'ritmo en vigilancia'}`,
      description: `${n(mine.actualTons, 1)} t observadas vs ${n(mine.expectedTonsToCutoff, 1)} t esperadas al corte; brecha ${n(gap, 1)} t.`,
      responsibleArea: 'Producción',
      href: '/dashboard/produccion/inteligencia',
      confidence: prodConfidence,
      confidenceReason: prodReason,
    });
  }

  for (const chain of rootCause.data?.chains || []) {
    if (chain.breakAt === 'resolved') continue;
    const cause = chain.workOrder?.rootCause?.trim()
      ? chain.workOrder.rootCause
      : chain.observation?.trim()
        ? chain.observation
        : 'Existe una observación operacional, pero la causa técnica todavía no está acreditada.';
    const confidence: Confidence = chain.evidenceLevel === 'linked' ? 'high' : chain.evidenceLevel === 'partial' ? 'medium' : 'medium';
    decisions.push({
      id: `root-cause-${chain.id}`,
      category: 'Cadena operacional',
      severity: rootCauseSeverity(chain),
      title: `${chain.assetCode || chain.assetName || 'Equipo'}: ${breakLabel[chain.breakAt]}`,
      description: chain.workOrder
        ? `${chain.workOrder.number} · ${chain.workOrder.title}. La cadena está acreditada hasta ${breakLabel[chain.breakAt].toLowerCase()}.`
        : `Observación operacional sin OT vinculada. La cadena se detiene antes de Mantención.`,
      responsibleArea: chain.breakAt === 'work_order' || chain.breakAt === 'materials' ? 'Mantención' : chain.breakAt === 'supply_need' ? 'Mantención / Bodega' : 'Compras',
      href: chain.workOrder ? `/dashboard/mantenimiento/ordenes-trabajo/${chain.workOrder.id}` : '/dashboard/decisiones/causa-raiz',
      confidence,
      confidenceReason: chain.evidenceLevel === 'linked'
        ? 'Cadena respaldada por vínculos canónicos explícitos entre OT y abastecimiento.'
        : chain.evidenceLevel === 'partial'
          ? 'Existe OT vinculada, pero la cadena aún no tiene evidencia completa de repuestos/abastecimiento.'
          : 'Existe evidencia operacional, pero todavía no hay OT vinculada; no se atribuye causa de Mantención, Inventario o Compras.',
      cause,
      breakPoint: breakLabel[chain.breakAt],
      nextAction: chain.action,
    });
  }

  const unique = new Map<string, Decision>();
  for (const decision of decisions) unique.set(decision.id, decision);
  const ordered = Array.from(unique.values()).sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.title.localeCompare(b.title));

  const critical = ordered.filter((d) => d.severity === 'critical').length;
  const lowConfidence = ordered.filter((d) => d.confidence === 'low').length;
  const withRootCause = ordered.filter((d) => d.breakPoint).length;

  const refresh = async () => {
    await Promise.all([base.mutate(), health.mutate(), production.mutate(), rootCause.mutate()]);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Gerencia · decisión operacional</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Centro ejecutivo de decisiones</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Excepciones priorizadas con confianza, causa acreditada, punto de corte de la cadena y siguiente acción. La ausencia de evidencia nunca se presenta como causalidad.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/dashboard/decisiones/causa-raiz"><GitBranch className="mr-2 h-4 w-4" />Causa raíz</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/calidad-datos/salud"><ShieldCheck className="mr-2 h-4 w-4" />Data Health</Link></Button>
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
        </div>
      </section>

      {error ? <Card className="border-destructive/30"><CardContent className="p-6 text-sm text-destructive">No fue posible construir la bandeja ejecutiva completa. No se muestran decisiones parciales como si fueran completas.</CardContent></Card> : null}

      <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Decisiones abiertas" value={loading ? '—' : n(ordered.length)} detail="Todas las áreas" />
        <Metric label="Críticas" value={loading ? '—' : n(critical)} detail="Requieren atención ejecutiva" />
        <Metric label="Con cadena causal" value={loading ? '—' : n(withRootCause)} detail="Punto de corte acreditado" />
        <Metric label="Fuentes en cautela" value={loading ? '—' : n(domains.filter((d) => d.status === 'watch').length)} detail="Data Health" />
        <Metric label="Confianza baja" value={loading ? '—' : n(lowConfidence)} detail="No usar como lectura operacional actual" />
      </section>

      <Card className="shadow-none">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div><CardTitle className="text-lg">Decisiones requeridas</CardTitle><p className="mt-1 text-sm text-muted-foreground">Severidad + confianza + evidencia causal. Calidad de datos y desempeño no se mezclan.</p></div>
          <Badge variant={critical ? 'destructive' : 'outline'}>{critical ? `${critical} crítica(s)` : 'Sin críticas'}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />)}</div> : ordered.length === 0 ? <div className="p-10 text-center"><CheckCircle2 className="mx-auto h-6 w-6 text-muted-foreground"/><p className="mt-3 font-medium">Sin decisiones abiertas</p></div> : <div className="divide-y border-t">{ordered.map((decision) => <div key={decision.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2"><Badge variant={decision.severity === 'critical' ? 'destructive' : 'outline'}>{severityLabel[decision.severity]}</Badge><Badge variant="secondary">{decision.category}</Badge><Badge variant={decision.confidence === 'low' ? 'destructive' : 'outline'}>{confidenceLabel[decision.confidence]}</Badge>{decision.breakPoint ? <Badge variant="outline">{decision.breakPoint}</Badge> : null}</div>
              <p className="mt-2 font-medium">{decision.title}</p><p className="mt-1 text-sm text-muted-foreground">{decision.description}</p>
              {decision.cause ? <p className="mt-2 text-sm"><span className="font-medium">Causa/evidencia:</span> {decision.cause}</p> : null}
              {decision.nextAction ? <p className="mt-1 text-sm"><span className="font-medium">Siguiente acción:</span> {decision.nextAction}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">{decision.confidenceReason}</p>
            </div>
            <div className="text-sm"><p className="text-xs text-muted-foreground">Responsable</p><p className="mt-1 font-medium">{decision.responsibleArea}</p>{decision.breakPoint ? <><p className="mt-3 text-xs text-muted-foreground">Punto de corte</p><p className="mt-1 font-medium">{decision.breakPoint}</p></> : null}</div>
            <Button asChild size="sm" variant={decision.severity === 'critical' ? 'default' : 'outline'}><Link href={decision.href}>Resolver <ArrowRight className="ml-2 h-4 w-4"/></Link></Button>
          </div>)}</div>}
        </CardContent>
      </Card>

      {productionHealth?.status === 'critical' ? <Card className="border-dashed"><CardContent className="flex gap-3 p-4 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><div><p className="font-medium">Señales de ritmo de Producción retenidas</p><p className="mt-1 text-muted-foreground">La fuente de Producción está en estado crítico de Data Health. Las desviaciones por mina no se escalan como fallas operacionales hasta actualizar la evidencia.</p></div></CardContent></Card> : null}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}
