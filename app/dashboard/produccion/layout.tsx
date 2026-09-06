'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Beaker, Drill, Factory, Gem, Map, Mountain, Route, Waypoints } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModuleAccess } from '@/hooks/use-module-access';

type ProductionGroup = 'workflow' | 'technical';

type ProductionItem = {
  href: string;
  label: string;
  icon: typeof Mountain;
  group: ProductionGroup;
  moduleKey?: string;
  anyModuleKeys?: string[];
};

const items: ProductionItem[] = [
  { href: '/dashboard/produccion', label: 'Resumen', icon: Mountain, group: 'workflow', moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/inteligencia', label: 'Mina / Sector', icon: Waypoints, group: 'workflow', moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/sondaje', label: 'Perforación', icon: Drill, group: 'workflow', anyModuleKeys: ['prod_sondaje_exploracion', 'prod_sondaje_produccion'] },
  { href: '/dashboard/produccion/transporte-mineral', label: 'Transporte', icon: Route, group: 'workflow', moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/planta-metalurgia', label: 'Planta / Metalurgia', icon: Factory, group: 'workflow', moduleKey: 'prod_operaciones' },
  { href: '/dashboard/produccion/geologia', label: 'Geología', icon: Gem, group: 'technical', moduleKey: 'prod_geologia' },
  { href: '/dashboard/produccion/topografia', label: 'Topografía', icon: Map, group: 'technical', moduleKey: 'prod_topografia' },
  { href: '/dashboard/produccion/quimica', label: 'Química', icon: Beaker, group: 'technical', moduleKey: 'prod_quimica' },
];

const groupMeta: Array<{ key: ProductionGroup; label: string; description: string }> = [
  { key: 'workflow', label: 'Flujo operacional', description: 'Ejecución de mina: planificación, perforación, transporte y planta.' },
  { key: 'technical', label: 'Control técnico', description: 'Disciplinas que interpretan, validan y soportan la operación.' },
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

  const availableGroups = useMemo(
    () => groupMeta.filter((group) => visibleItems.some((item) => item.group === group.key)),
    [visibleItems],
  );

  const activeGroupKey: ProductionGroup =
    visibleItems.find((item) => isItemActive(pathname, item))?.group ||
    availableGroups[0]?.key ||
    'workflow';

  const activeGroup = groupMeta.find((group) => group.key === activeGroupKey) || groupMeta[0];
  const activeItems = visibleItems.filter((item) => item.group === activeGroupKey);

  return (
    <div className="space-y-5">
      <section className="border-b border-border pb-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Operaciones mineras</p>
          <p className="mt-1 text-sm text-muted-foreground">Primero elige el tipo de trabajo; después sólo aparecen las áreas relevantes para ese contexto.</p>
        </div>

        <nav className="flex gap-1 overflow-x-auto" aria-label="Grupos de Producción">
          {availableGroups.map((group) => {
            const firstItem = visibleItems.find((item) => item.group === group.key);
            if (!firstItem) return null;
            const active = group.key === activeGroupKey;
            return (
              <Link
                key={group.key}
                href={firstItem.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-9 shrink-0 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {group.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 rounded-lg border bg-muted/10 p-3">
          <div className="mb-2">
            <p className="text-xs font-medium text-foreground">{activeGroup.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{activeGroup.description}</p>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Navegación de Producción">
            {activeItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(pathname, item);
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
        </div>
      </section>
      {children}
    </div>
  );
}
