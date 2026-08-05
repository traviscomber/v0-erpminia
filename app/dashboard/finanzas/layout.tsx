'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileSearch, Landmark, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard/finanzas', label: 'Resumen', icon: Landmark },
  { href: '/dashboard/finanzas/centros', label: 'Centros', icon: Landmark },
  { href: '/dashboard/finanzas/proveedores', label: 'Proveedores', icon: Users },
  { href: '/dashboard/finanzas/trazabilidad', label: 'Trazabilidad', icon: FileSearch },
];

export default function FinanceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <section className="border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Finanzas</p>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Navegación de finanzas">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/dashboard/finanzas'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
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
