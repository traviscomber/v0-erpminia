'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpenCheck, ClipboardCheck, FileArchive, GraduationCap, HardHat, ShieldCheck, BadgeDollarSign } from 'lucide-react';
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
      <section className="border-b border-border pb-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Sostenibilidad y HSE · Seguridad y salud
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Control preventivo, inspecciones, formación, habilitación y cumplimiento.
          </p>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Navegación de prevención de riesgos">
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
                  'inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </section>
      {children}
    </div>
  );
}
