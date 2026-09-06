'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Beaker, ChevronRight, Drill, Factory, Gem, Map, Mountain, Route, Waypoints } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModuleAccess } from '@/hooks/use-module-access';

type ProductionLane = 'flow' | 'technical';

type ProductionItem = {
  href: string;
  label: string;
  icon: typeof Mountain;
  lane: ProductionLane;
  step?: number;
  moduleKey?: string;
  anyModuleKeys?: string[];
};

const items: ProductionItem[] = [
  { href: '/dashboard/produccion', label: 'Resumen', icon: Mountain, lane: 'flow', step: 1, moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/inteligencia', label: 'Mina / Sector', icon: Waypoints, lane: 'flow', step: 2, moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/sondaje', label: 'Perforación', icon: Drill, lane: 'flow', step: 3, anyModuleKeys: ['prod_sondaje_exploracion', 'prod_sondaje_produccion'] },
  { href: '/dashboard/produccion/transporte-mineral', label: 'Transporte', icon: Route, lane: 'flow', step: 4, moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/planta-metalurgia', label: 'Planta / Metalurgia', icon: Factory, lane: 'flow', step: 5, moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/geologia', label: 'Geología', icon: Gem, lane: 'technical', moduleKey: 'prod_geologia' },
  { href: '/dashboard/produccion/topografia', label: 'Topografía', icon: Map, lane: 'technical', moduleKey: 'prod_topografia' },
  { href: '/dashboard/produccion/quimica', label: 'Química', icon: Beaker, lane: 'technical', moduleKey: 'prod_quimica' },
];

function isItemActive(pathname: string, item: ProductionItem) {
  return item.href === '/dashboard/produccion'
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function ProduccionLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { enforced, canView } = useModuleAccess();

  const visibleItems = useMemo(() => {
    if (!enforced) return items;
    return items.filter((item) => {
      if (item.anyModuleKeys?.length) return item.anyModuleKeys.some((key) => canView(key));
      if (item.moduleKey) return canView(item.moduleKey);
      return true;
    });
  }, [enforced, canView]);

  const flowItems = visibleItems.filter((item) => item.lane === 'flow');
  const technicalItems = visibleItems.filter((item) => item.lane === 'technical');

  return (
    <div className="space-y-5">
      <section className="border-b border-border" aria-label="Flujo de Producción">
        <div className="flex min-h-12 items-stretch overflow-x-auto scrollbar-none">
          {flowItems.length ? (
            <nav className="flex shrink-0 items-stretch" aria-label="Flujo operacional de Producción">
              {flowItems.map((item, index) => {
                const Icon = item.icon;
                const active = isItemActive(pathname, item);
                return (
                  <div key={item.href} className="flex shrink-0 items-center">
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative inline-flex min-h-12 shrink-0 items-center gap-2 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span className={cn('text-[9px] font-semibold tracking-[0.12em]', active ? 'text-primary' : 'text-muted-foreground/60')}>
                        {String(item.step).padStart(2, '0')}
                      </span>
                      <Icon className="h-3.5 w-3.5" />
                      <span className="whitespace-nowrap">{item.label}</span>
                      {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
                    </Link>
                    {index < flowItems.length - 1 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" aria-hidden="true" /> : null}
                  </div>
                );
              })}
            </nav>
          ) : null}

          {flowItems.length && technicalItems.length ? <div className="mx-3 my-3 w-px shrink-0 bg-border" aria-hidden="true" /> : null}

          {technicalItems.length ? (
            <div className="flex shrink-0 items-stretch">
              <span className="flex items-center px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                Control técnico
              </span>
              <nav className="flex items-stretch" aria-label="Control técnico de Producción">
                {technicalItems.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative inline-flex min-h-12 shrink-0 items-center gap-2 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="whitespace-nowrap">{item.label}</span>
                      {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ) : null}
        </div>
      </section>
      {children}
    </div>
  );
}
