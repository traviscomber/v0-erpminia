'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const flowItems = [
  { href: '/dashboard/mantenimiento/planificacion', label: 'Planificar', step: 1 },
  { href: '/dashboard/mantenimiento/ordenes-trabajo', label: 'Órdenes', step: 2 },
  { href: '/dashboard/mantenimiento/ordenes-trabajo/cierre', label: 'Cierre', step: 3 },
];

const supportItems = [
  { href: '/dashboard/mantenimiento', label: 'Resumen' },
  { href: '/dashboard/mantenimiento/ordenes-trabajo/imputacion', label: 'Imputación' },
  { href: '/dashboard/mantenimiento/equipos', label: 'Activos' },
  { href: '/dashboard/mantenimiento/maestranza', label: 'Maestranza' },
  { href: '/dashboard/mantenimiento/personal', label: 'Personal' },
  { href: '/dashboard/mantenimiento/indicadores', label: 'Indicadores' },
];

const assetViewPrefixes = [
  '/dashboard/mantenimiento/disponibilidad',
  '/dashboard/mantenimiento/costos',
  '/dashboard/mantenimiento/neumaticos',
  '/dashboard/mantenimiento/componentes-mayores',
  '/dashboard/mantenimiento/fichas-tecnicas',
  '/dashboard/mantenimiento/documentos/expedientes',
  '/dashboard/mantenimiento/centro-costo',
  '/dashboard/mantenimiento/vehiculos',
  '/dashboard/mantenimiento/ciclo-vida',
  '/dashboard/mantenimiento/data-readiness',
];

const planningPrefixes = [
  '/dashboard/mantenimiento/campanas',
  '/dashboard/mantenimiento/confiabilidad',
  '/dashboard/mantenimiento/bom',
  '/dashboard/mantenimiento/planes-estandar',
  '/dashboard/mantenimiento/retroalimentacion-renovacion',
  '/dashboard/mantenimiento/aplicacion-retroalimentacion',
  '/dashboard/mantenimiento/aprobacion-retroalimentacion',
  '/dashboard/mantenimiento/verificacion-retroalimentacion',
  '/dashboard/mantenimiento/seguimiento-excepciones',
  '/dashboard/mantenimiento/estrategia',
];

function isFlowActive(pathname: string, href: string) {
  if (href === '/dashboard/mantenimiento/planificacion') {
    return pathname === href || pathname.startsWith(`${href}/`) || planningPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }
  if (href === '/dashboard/mantenimiento/ordenes-trabajo') {
    return (
      (pathname === href || pathname.startsWith(`${href}/`)) &&
      !pathname.startsWith('/dashboard/mantenimiento/ordenes-trabajo/imputacion') &&
      !pathname.startsWith('/dashboard/mantenimiento/ordenes-trabajo/cierre')
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isSupportActive(pathname: string, href: string) {
  if (href === '/dashboard/mantenimiento') return pathname === href;
  if (href === '/dashboard/mantenimiento/equipos') {
    return pathname === href || pathname.startsWith(`${href}/`) || assetViewPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MaintenanceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <section className="border-b border-border" aria-label="Flujo de Mantenimiento">
        <div className="flex min-h-12 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <nav className="flex shrink-0 items-stretch" aria-label="Flujo operacional de Mantenimiento">
            {flowItems.map((item, index) => {
              const active = isFlowActive(pathname, item.href);
              return (
                <div key={item.href} className="flex shrink-0 items-center">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-12 shrink-0 items-center gap-1.5 px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className={cn('text-[9px] font-semibold tracking-[0.12em]', active ? 'text-primary' : 'text-muted-foreground/60')}>
                      {String(item.step).padStart(2, '0')}
                    </span>
                    <span className="whitespace-nowrap">{item.label}</span>
                    {active ? <span className="absolute inset-x-2.5 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
                  </Link>
                  {index < flowItems.length - 1 ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/35" aria-hidden="true" /> : null}
                </div>
              );
            })}
          </nav>

          <div className="mx-2 my-3 w-px shrink-0 bg-border" aria-hidden="true" />

          <div className="flex shrink-0 items-stretch">
            <span className="flex items-center px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
              Soporte
            </span>
            <nav className="flex items-stretch" aria-label="Soporte de Mantenimiento">
              {supportItems.map((item) => {
                const active = isSupportActive(pathname, item.href);
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
