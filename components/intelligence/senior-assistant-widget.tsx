'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, X } from 'lucide-react';

const CONTEXT_BY_PATH = [
  ['/dashboard/geologia', 'Geología'],
  ['/dashboard/mantenimiento', 'Mantenimiento'],
  ['/dashboard/mantencion', 'Mantenimiento'],
  ['/dashboard/inventario', 'Inventario'],
  ['/dashboard/bodega', 'Bodega'],
  ['/dashboard/compras', 'Compras'],
  ['/dashboard/produccion', 'Producción'],
  ['/dashboard/finanzas', 'Finanzas'],
  ['/dashboard/calidad-datos', 'Calidad de datos'],
  ['/dashboard/documentos', 'Documentación'],
  ['/dashboard/decisiones', 'Centro Ejecutivo'],
] as const;

function SeniorAssistantMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 72"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <path
        d="M15 23.5c0-8.6 7-15.5 15.5-15.5h11C50 8 57 14.9 57 23.5V25c5.2 3.8 8.5 10 8.5 17 0 11.9-9.6 21.5-21.5 21.5H31.2L19 68v-7.8C11.6 56.7 6.5 49.1 6.5 40.3 6.5 33.4 9.8 27.3 15 23.5Z"
        className="fill-background stroke-border"
        strokeWidth="2"
      />
      <path
        d="M20 23.5c1.7-7.4 8.3-12.8 16-12.8s14.3 5.4 16 12.8H20Z"
        className="fill-card stroke-foreground"
        strokeWidth="2"
      />
      <path
        d="M31 10.8h10l2.2 12.7H28.8L31 10.8Z"
        className="fill-primary"
      />
      <path
        d="M15.8 25h40.4v4.7H15.8V25Z"
        className="fill-foreground"
      />
      <rect
        x="16"
        y="29.5"
        width="40"
        height="27"
        rx="9"
        className="fill-card stroke-secondary"
        strokeWidth="3"
      />
      <path
        d="M24.5 41.5c1.7-2.5 5.2-2.5 7 0"
        className="fill-none stroke-secondary"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M40.5 41.5c1.7-2.5 5.2-2.5 7 0"
        className="fill-none stroke-secondary"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M30.8 48.2c3.5 3.2 7 3.2 10.4 0"
        className="fill-none stroke-primary"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M58.5 32.5c3.7 2 5.5 5.3 5.5 9.2 0 3.6-1.5 6.4-4.4 8.4"
        className="fill-none stroke-secondary"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M61.8 18.2h3.8M60.8 12.8l2.7-2.7M60.8 23.5l2.7 2.7"
        className="fill-none stroke-primary"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

export function SeniorAssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const contextLabel = useMemo(() => {
    const match = CONTEXT_BY_PATH.find(([prefix]) => pathname.startsWith(prefix));
    return match?.[1] ?? 'MOTIL';
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      {open ? (
        <section
          aria-label="Asistente Senior MOTIL"
          className="fixed bottom-24 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-card shadow-xl md:right-6"
        >
          <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-background">
              <SeniorAssistantMark className="size-10" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-sm font-semibold text-foreground">Asistente Senior</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">Contexto: {contextLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Cerrar Asistente Senior"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-primary">
                Un solo asistente para todo el OS
              </span>
              <p className="text-sm leading-6 text-foreground">
                Consulta estado, causas, prioridades y acciones desde un único punto. MOTIL usa sólo el contexto y las fuentes necesarias para cada análisis.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href="/dashboard/decisiones"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-10 items-center justify-between gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Centro Ejecutivo
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/dashboard/acciones"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-10 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                Mis acciones
                <ArrowUpRight className="size-4 text-secondary" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-5 right-4 z-50 flex size-16 items-center justify-center rounded-full border border-primary/50 bg-card shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:right-6"
        aria-label={open ? 'Cerrar Asistente Senior' : 'Abrir Asistente Senior'}
        aria-expanded={open}
      >
        <SeniorAssistantMark className="size-14" />
        <span className="sr-only">Asistente Senior MOTIL</span>
      </button>
    </>
  );
}
