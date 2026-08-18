'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, FileCheck2, FileText, Leaf, ShieldCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const moduleNav = [
  { label: 'Resumen', href: '/dashboard/sostenibilidad', icon: Leaf, exact: true },
  { label: 'Seguridad y salud', href: '/dashboard/sostenibilidad/prevencion-riesgos', icon: ShieldCheck },
  { label: 'Cumplimiento minero', href: '/dashboard/sostenibilidad/compliance', icon: FileCheck2 },
  { label: 'Medio ambiente', href: '/dashboard/sostenibilidad/medio-ambiente', icon: Leaf },
  { label: 'Comunidades', href: '/dashboard/sostenibilidad/comunidades', icon: Users },
  { label: 'Calendario', href: '/dashboard/sostenibilidad/calendario', icon: CalendarDays },
  { label: 'Documentos', href: '/dashboard/sostenibilidad/documentos', icon: FileText },
];

export default function SostenibilidadLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const insideRiskPrevention = pathname.startsWith('/dashboard/sostenibilidad/prevencion-riesgos');

  return (
    <div className="space-y-5">
      {!insideRiskPrevention ? (
        <section className="border-b border-border pb-3">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sostenibilidad y HSE</p>
            <p className="mt-1 text-sm text-muted-foreground">Seguridad, cumplimiento minero, ambiente y comunidades.</p>
          </div>
          <nav aria-label="Navegación de Sostenibilidad y HSE" className="overflow-x-auto pb-1">
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
                      'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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
      ) : null}
      {children}
    </div>
  );
}
