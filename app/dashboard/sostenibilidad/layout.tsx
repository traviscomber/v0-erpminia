'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, FileText, Leaf, ShieldCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const moduleNav = [
  {
    label: 'Resumen',
    href: '/dashboard/sostenibilidad',
    icon: Leaf,
    exact: true,
  },
  {
    label: 'Seguridad y salud',
    href: '/dashboard/sostenibilidad/prevencion-riesgos',
    icon: ShieldCheck,
  },
  {
    label: 'Medio ambiente',
    href: '/dashboard/sostenibilidad/medio-ambiente',
    icon: Leaf,
  },
  {
    label: 'Comunidades',
    href: '/dashboard/sostenibilidad/comunidades',
    icon: Users,
  },
  {
    label: 'Calendario',
    href: '/dashboard/sostenibilidad/calendario',
    icon: CalendarDays,
  },
  {
    label: 'Documentación',
    href: '/dashboard/sostenibilidad/documentos',
    icon: FileText,
  },
];

export default function SostenibilidadLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border/70 bg-card/70 px-4 py-3 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Módulo operacional
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Sostenibilidad y HSE</h2>
              <p className="text-sm text-muted-foreground">
                Seguridad, cumplimiento ambiental, comunidades y evidencia documental.
              </p>
            </div>
          </div>

          <nav aria-label="Navegación de Sostenibilidad y HSE" className="-mx-1 overflow-x-auto px-1">
            <div className="flex min-w-max items-center gap-1">
              {moduleNav.map((item) => {
                const Icon = item.icon;
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
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
        </div>
      </section>

      {children}
    </div>
  );
}
