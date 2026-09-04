'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Beaker, Factory, Gem, Map, Mountain, Route, Waypoints } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModuleAccess } from '@/hooks/use-module-access';

type ProductionItem = {
  href: string;
  label: string;
  icon: typeof Mountain;
  moduleKey?: string;
  anyModuleKeys?: string[];
};

const items: ProductionItem[] = [
  { href: '/dashboard/produccion', label: 'Resumen', icon: Mountain, moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/inteligencia', label: 'Inteligencia Mina / Sector', icon: Waypoints, moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/transporte-mineral', label: 'Transporte de Mineral', icon: Route, moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/planta-metalurgia', label: 'Planta / Metalurgia', icon: Factory, moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/geologia', label: 'Geología', icon: Gem, moduleKey: 'prod_geologia' },
  { href: '/dashboard/produccion/topografia', label: 'Topografía', icon: Map, moduleKey: 'prod_topografia' },
  { href: '/dashboard/produccion/quimica', label: 'Química', icon: Beaker, moduleKey: 'prod_quimica' },
  { href: '/dashboard/produccion/sondaje', label: 'Sondaje', icon: Waypoints, anyModuleKeys: ['prod_sondaje_exploracion', 'prod_sondaje_produccion'] },
];

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

  return (
    <div className="space-y-5">
      <section className="border-b border-border pb-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Operaciones mineras</p>
          <p className="mt-1 text-sm text-muted-foreground">Sólo se muestran las disciplinas habilitadas para tu cargo.</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Navegación de Producción">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/dashboard/produccion'
              ? pathname === item.href
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
