'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, ClipboardCheck, GraduationCap, HardHat, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json().catch(() => null);
  if (!response.ok) return null;
  return data;
};

const normalizeCount = (payload: any): number => {
  if (!payload) return 0;
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload.data)) return payload.data.length;
  if (Array.isArray(payload.items)) return payload.items.length;
  if (typeof payload.total === 'number') return payload.total;
  if (typeof payload.count === 'number') return payload.count;
  return 0;
};

export default function PrevencionRiesgosPage() {
  const { data: nc } = useSWR('/api/sostenibilidad/no-conformidades', fetcher);
  const { data: ac } = useSWR('/api/sostenibilidad/corrective-actions', fetcher);
  const { data: insp } = useSWR('/api/sostenibilidad/inspecciones', fetcher);
  const { data: cap } = useSWR('/api/sostenibilidad/capacitaciones', fetcher);
  const { data: epp } = useSWR('/api/sostenibilidad/epp', fetcher);

  const items = [
    { href: '/dashboard/sostenibilidad/prevencion-riesgos/no-conformidades', label: 'No conformidades', count: normalizeCount(nc), icon: AlertTriangle },
    { href: '/dashboard/sostenibilidad/prevencion-riesgos/acciones-correctivas', label: 'Acciones correctivas', count: normalizeCount(ac), icon: ClipboardCheck },
    { href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones', label: 'Inspecciones', count: normalizeCount(insp), icon: Shield },
    { href: '/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones', label: 'Capacitaciones', count: normalizeCount(cap), icon: GraduationCap },
    { href: '/dashboard/sostenibilidad/prevencion-riesgos/epp', label: 'EPP', count: normalizeCount(epp), icon: HardHat },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Seguridad y salud</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Prevención de Riesgos</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Detecta, corrige y previene riesgos con una sola vista operativa.</p></div>
        <Button asChild><Link href="/dashboard/sostenibilidad/prevencion-riesgos/inspecciones">Nueva inspección</Link></Button>
      </header>

      <section className="overflow-hidden rounded-lg border" aria-label="Áreas de prevención">
        {items.map((item) => {
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} className="group flex items-center gap-4 border-b px-4 py-4 last:border-b-0 hover:bg-muted/35"><Icon className="h-4 w-4 shrink-0 text-muted-foreground"/><span className="flex-1 font-medium">{item.label}</span><span className="text-sm tabular-nums text-muted-foreground">{item.count}</span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1"/></Link>;
        })}
      </section>

      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-sm">
        <Link className="text-muted-foreground hover:text-foreground" href="/dashboard/sostenibilidad/prevencion-riesgos/kpi">Indicadores</Link>
        <Link className="text-muted-foreground hover:text-foreground" href="/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse">Documentos HSE</Link>
        <Link className="text-muted-foreground hover:text-foreground" href="/dashboard/sostenibilidad/prevencion-riesgos/carpeta-arranque">Carpeta de Arranque</Link>
        <Link className="text-muted-foreground hover:text-foreground" href="/dashboard/sostenibilidad/prevencion-riesgos/epp/diagnostico">Diagnóstico EPP</Link>
      </div>
    </div>
  );
}
