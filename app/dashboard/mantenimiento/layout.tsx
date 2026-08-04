'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, CircleDollarSign, FileText, Fuel, Gauge, Settings, Users, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard/mantenimiento', label: 'Resumen', icon: Wrench },
  { href: '/dashboard/mantenimiento/equipos', label: 'Equipos', icon: Settings },
  { href: '/dashboard/mantenimiento/disponibilidad', label: 'Disponibilidad', icon: Gauge },
  { href: '/dashboard/mantenimiento/personal', label: 'Personal', icon: Users },
  { href: '/dashboard/mantenimiento/costos', label: 'Costos', icon: CircleDollarSign },
  { href: '/dashboard/mantenimiento/combustible', label: 'Combustible', icon: Fuel },
  { href: '/dashboard/mantenimiento/neumaticos', label: 'Neumáticos', icon: Activity },
  { href: '/dashboard/mantenimiento/componentes-mayores', label: 'Componentes', icon: Settings },
  { href: '/dashboard/mantenimiento/fichas-tecnicas', label: 'Catálogo técnico', icon: FileText },
];

export default function MaintenanceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <section className="border-b border-border pb-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mantenimiento</p>
          <p className="mt-1 text-sm text-muted-foreground">Operación, activos, disponibilidad, costos y trazabilidad técnica.</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Navegación de mantenimiento">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/dashboard/mantenimiento'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
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
