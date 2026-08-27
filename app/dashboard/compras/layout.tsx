'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRightLeft, BarChart3, Building2, FileCheck2, History, Search, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard/compras/flujo', label: 'Comprar', icon: ShoppingCart },
  { href: '/dashboard/compras/control-proveedores/candidatos', label: 'Cotizar', icon: Search },
  { href: '/dashboard/compras', label: 'Órdenes', icon: History },
  { href: '/dashboard/compras/devoluciones', label: 'Devoluciones', icon: ArrowRightLeft },
  { href: '/dashboard/compras/facturas', label: 'Facturas', icon: FileCheck2 },
  { href: '/dashboard/compras/proveedores-360', label: 'Proveedores', icon: Building2 },
  { href: '/dashboard/compras/inteligencia', label: 'Análisis', icon: BarChart3 },
];

const supplierPrefixes = [
  '/dashboard/compras/control-proveedores',
  '/dashboard/compras/proveedores-360',
];

export default function PurchasesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <section className="border-b border-border pb-3">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Abastecimiento</p>
          <p className="mt-1 text-sm text-muted-foreground">Comprar bien, comparar antes de cotizar y mantener trazabilidad.</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-1" aria-label="Navegación de compras">
          {items.map((item) => {
            const Icon = item.icon;
            const supplierContext = item.href === '/dashboard/compras/proveedores-360'
              && supplierPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
              && pathname !== '/dashboard/compras/control-proveedores/candidatos';
            const active = item.href === '/dashboard/compras'
              ? pathname === item.href || pathname === '/dashboard/compras/importar-existencias'
              : supplierContext || pathname === item.href || pathname.startsWith(`${item.href}/`);

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
