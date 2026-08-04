'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpenCheck, ClipboardCheck, FileArchive, GraduationCap, HardHat, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard/sostenibilidad/prevencion-riesgos', label: 'Resumen', icon: ShieldCheck },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/kpi', label: 'KPI', icon: BarChart3 },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones', label: 'Inspecciones', icon: ClipboardCheck },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones', label: 'Capacitaciones', icon: GraduationCap },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/epp', label: 'EPP', icon: HardHat },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/documentos', label: 'Documentos', icon: BookOpenCheck },
  { href: '/dashboard/sostenibilidad/prevencion-riesgos/carpeta-arranque', label: 'Carpeta de arranque', icon: FileArchive },
];

export default function RiskPreventionLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card px-4 py-3">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sostenibilidad y HSE · Seguridad y salud</p>
          <p className="mt-1 text-sm text-muted-foreground">Control preventivo, inspecciones, formación, habilitación y cumplimiento.</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Navegación de prevención de riesgos">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/dashboard/sostenibilidad/prevencion-riesgos'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
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
