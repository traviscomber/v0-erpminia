'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, BarChart3, BookOpenCheck, ClipboardCheck, FileArchive, GraduationCap, HardHat, ShieldCheck, BadgeDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard/sostenibilidad/prevencion-riesgos', label: 'Resumen', icon: ShieldCheck },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/kpi', label: 'Indicadores', icon: BarChart3 },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones', label: 'Inspecciones', icon: ClipboardCheck },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones', label: 'Capacitaciones', icon: GraduationCap },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/epp', label: 'EPP', icon: HardHat },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/epp/diagnostico', label: 'Diagnóstico EPP', icon: BadgeDollarSign },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse', label: 'Documentos', icon: BookOpenCheck },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/carpeta-arranque', label: 'Carpeta de arranque', icon: FileArchive },
];

export default function RiskPreventionLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <section className="border-b border-border pb-3">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Seguridad y salud</p>
            <p className="mt-1 text-sm text-muted-foreground">Prevención, inspecciones, formación, EPP y cumplimiento.</p>
          </div>
          <Link
            href="/dashboard/sostenibilidad"
            className="inline-flex h-8 items-center gap-1.5 self-start rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Sostenibilidad
          </Link>
        </div>
        <nav className="overflow-x-auto pb-1" aria-label="Navegación de prevención de riesgos">
          <div className="flex min-w-max gap-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = item.href === '/dashboard/sostenibilidad/prevencion-riesgos'
                ? pathname === item.href
                : item.href === '/dashboard/sostenibilidad/prevencion-riesgos/epp'
                  ? pathname === item.href || pathname === `${item.href}/importar`
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </section>
      {children}
    </div>
  );
}
