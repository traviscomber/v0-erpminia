'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Beaker, Factory, Gem, Map, Mountain, Route, Waypoints } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard/produccion', label: 'Resumen', icon: Mountain },
  { href: '/dashboard/produccion/inteligencia', label: 'Inteligencia Mina / Sector', icon: Waypoints },
  { href: '/dashboard/produccion/transporte-mineral', label: 'Transporte de Mineral', icon: Route },
  { href: '/dashboard/produccion/planta-metalurgia', label: 'Planta / Metalurgia', icon: Factory },
  { href: '/dashboard/produccion/geologia', label: 'Geología', icon: Gem },
  { href: '/dashboard/produccion/topografia', label: 'Topografía', icon: Map },
  { href: '/dashboard/produccion/quimica', label: 'Química', icon: Beaker },
  { href: '/dashboard/produccion/sondaje', label: 'Sondaje', icon: Waypoints },
];

export default function ProduccionLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <section className="border-b border-border pb-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Operaciones mineras</p>
          <p className="mt-1 text-sm text-muted-foreground">Producción integra transporte, planta, metalurgia y disciplinas técnicas de soporte operacional.</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible" aria-label="Navegación de Producción">
          {items.map((item) => {
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
                  'inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full lg:justify-center',
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
