'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Calendar, ClipboardList, Gauge, Settings, Users, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard/mantenimiento', label: 'Resumen', icon: Wrench },
  { href: '/dashboard/mantenimiento/ordenes-trabajo', label: 'Órdenes', icon: ClipboardList },
  { href: '/dashboard/mantenimiento/planificacion', label: 'Planificar', icon: Calendar },
  { href: '/dashboard/mantenimiento/equipos', label: 'Activos', icon: Settings },
  { href: '/dashboard/mantenimiento/maestranza', label: 'Maestranza', icon: Gauge },
  { href: '/dashboard/mantenimiento/personal', label: 'Personal', icon: Users },
  { href: '/dashboard/mantenimiento/indicadores', label: 'Indicadores', icon: BarChart3 },
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

export default function MaintenanceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <section className="border-b border-border pb-3">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mantenimiento</p>
          <p className="mt-1 text-sm text-muted-foreground">Resolver trabajo, cuidar activos y aprender del historial.</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-1" aria-label="Navegación de mantenimiento">
          {items.map((item) => {
            const Icon = item.icon;
            const isAssetContext = item.href === '/dashboard/mantenimiento/equipos' && assetViewPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
            const isPlanningContext = item.href === '/dashboard/mantenimiento/planificacion' && planningPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
            const active = item.href === '/dashboard/mantenimiento'
              ? pathname === item.href
              : isAssetContext || isPlanningContext || pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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
