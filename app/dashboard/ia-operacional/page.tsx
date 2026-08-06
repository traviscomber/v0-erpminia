'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock3, PackageSearch, ShieldAlert, Wrench } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

const fetcher = async (url: string) => {
  const response = await apiFetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'No fue posible cargar el estado operacional.');
  return payload;
};

const labels: Record<string, string> = {
  critical: 'Atención inmediata',
  high: 'Prioridad alta',
  medium: 'Seguimiento',
  low: 'Sin urgencia',
};

const styles: Record<string, string> = {
  critical: 'border-destructive/40 bg-destructive/5 text-destructive',
  high: 'border-orange-500/40 bg-orange-500/5',
  medium: 'border-amber-500/40 bg-amber-500/5',
  low: 'border-emerald-500/30 bg-emerald-500/5',
};

export default function OperationalHealthPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/dashboard/ia-operacional', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60000,
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando estado operacional…</div>;
  if (error) return <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">{error.message}</div>;

  const summary = data?.summary || {};
  const decisions = data?.decisions || [];
  const assets = data?.healthItems || [];

  return <main className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Operación</p>
        <h1 className="mt-1 text-2xl font-semibold">Centro de salud operacional</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Muestra condiciones registradas que requieren acción. Cada prioridad indica la razón y el siguiente paso.</p>
      </div>
      <button onClick={() => mutate()} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">Actualizar</button>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric label="Atención inmediata" value={summary.critical || 0} icon={ShieldAlert}/>
      <Metric label="Prioridad alta" value={summary.high || 0} icon={AlertTriangle}/>
      <Metric label="Seguimiento" value={summary.medium || 0} icon={Clock3}/>
      <Metric label="Equipos sin urgencia" value={summary.healthyAssets || 0} icon={CheckCircle2}/>
      <Metric label="Eficiencia registrada" value={`${Number(summary.operationalEfficiency || 0).toFixed(0)}%`} icon={Wrench}/>
    </section>

    <section className="rounded-lg border bg-card">
      <div className="border-b p-4">
        <h2 className="font-semibold">Decisiones requeridas</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ordenadas por urgencia. No incluye recomendaciones sin respaldo registrado.</p>
      </div>
      <div className="divide-y">
        {decisions.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No existen decisiones urgentes con los datos actuales.</p> : decisions.map((item: any, index: number) => <article key={`${item.type}-${item.id}-${index}`} className="grid gap-3 p-4 md:grid-cols-[150px_1fr_auto] md:items-center">
          <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${styles[item.level] || styles.medium}`}>{labels[item.level] || 'Seguimiento'}</span>
          <div>
            <p className="font-medium">{item.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p>
            <p className="mt-1 text-sm">Siguiente acción: {item.action}</p>
          </div>
          {item.type === 'equipment' && <Link href={`/dashboard/mantenimiento/equipos/${item.id}`} className="text-sm font-medium underline-offset-4 hover:underline">Abrir equipo</Link>}
          {item.type === 'stock' && <Link href="/dashboard/bodega/productos-360" className="text-sm font-medium underline-offset-4 hover:underline">Abrir bodega</Link>}
          {item.type === 'document' && <Link href="/dashboard/documentos" className="text-sm font-medium underline-offset-4 hover:underline">Abrir documentos</Link>}
        </article>)}
      </div>
    </section>

    <section className="rounded-lg border bg-card">
      <div className="border-b p-4">
        <h2 className="font-semibold">Estado de los equipos</h2>
        <p className="mt-1 text-sm text-muted-foreground">El nivel usa estado, criticidad y órdenes registradas.</p>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset: any) => <Link key={String(asset.id)} href={`/dashboard/mantenimiento/equipos/${asset.id}`} className={`rounded-lg border p-4 transition-colors hover:bg-muted/40 ${styles[asset.level] || ''}`}>
          <div className="flex items-start justify-between gap-4">
            <div><p className="font-medium">{asset.name}</p><p className="text-xs text-muted-foreground">{labels[asset.level]}</p></div>
            <span className="text-lg font-semibold">{asset.score}</span>
          </div>
          <div className="mt-3 space-y-1 text-sm">{asset.reasons.length ? asset.reasons.map((reason: string) => <p key={reason}>• {reason}</p>) : <p>Sin señales operacionales urgentes.</p>}</div>
          <p className="mt-3 text-xs text-muted-foreground">{asset.action}</p>
        </Link>)}
      </div>
    </section>

    <p className="text-xs text-muted-foreground">{data?.policy} Última actualización: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString('es-CL') : 'sin fecha'}.</p>
  </main>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof PackageSearch }) {
  return <article className="rounded-lg border bg-card p-4"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">{label}</span><Icon className="h-4 w-4"/></div><p className="mt-2 text-2xl font-semibold">{value}</p></article>;
}
