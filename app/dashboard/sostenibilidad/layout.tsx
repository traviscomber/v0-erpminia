'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const domainItems = [
  { label: 'Resumen', href: '/dashboard/sostenibilidad', exact: true },
  { label: 'Seguridad y salud', href: '/dashboard/sostenibilidad/prevencion-riesgos' },
  { label: 'Cumplimiento minero', href: '/dashboard/sostenibilidad/compliance' },
  { label: 'Medio ambiente', href: '/dashboard/sostenibilidad/medio-ambiente' },
  { label: 'Comunidades', href: '/dashboard/sostenibilidad/comunidades' },
];

const supportItems = [
  { label: 'Calendario', href: '/dashboard/sostenibilidad/calendario' },
  { label: 'Documentos', href: '/dashboard/sostenibilidad/documentos' },
];

function isActive(pathname: string, href: string, exact = false) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function SostenibilidadLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <section className="border-b border-border" aria-label="Área de Sostenibilidad y HSE">
        <div className="flex min-h-12 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 items-stretch">
            <span className="flex items-center px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
              Ámbitos
            </span>
            <nav className="flex items-stretch" aria-label="Ámbitos de Sostenibilidad y HSE">
              {domainItems.map((item) => {
                const active = isActive(pathname, item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-12 shrink-0 items-center px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="whitespace-nowrap">{item.label}</span>
                    {active ? <span className="absolute inset-x-2.5 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mx-2 my-3 w-px shrink-0 bg-border" aria-hidden="true" />

          <div className="flex shrink-0 items-stretch">
            <span className="flex items-center px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
              Soporte
            </span>
            <nav className="flex items-stretch" aria-label="Soporte de Sostenibilidad y HSE">
              {supportItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-12 shrink-0 items-center px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="whitespace-nowrap">{item.label}</span>
                    {active ? <span className="absolute inset-x-2.5 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </section>
      {children}
    </div>
  );
}
