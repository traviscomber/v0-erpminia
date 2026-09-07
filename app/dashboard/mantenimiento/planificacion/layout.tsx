'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const views = [
  { href: '/dashboard/mantenimiento/planificacion', label: 'Planes preventivos' },
  { href: '/dashboard/mantenimiento/planificacion/recursos', label: 'Recursos y capacidad' },
];

export default function MaintenancePlanningLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 border-b border-border/70" aria-label="Vistas de Planificación de Mantenimiento">
        {views.map((view) => {
          const active = view.href === '/dashboard/mantenimiento/planificacion'
            ? pathname === view.href
            : pathname === view.href || pathname.startsWith(`${view.href}/`);
          return (
            <Link
              key={view.href}
              href={view.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative px-3 py-2 text-xs font-medium transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {view.label}
              {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
