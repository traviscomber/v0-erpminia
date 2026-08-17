'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrainCircuit, Building2, FileText, History, Search, ShieldCheck, Waypoints } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard/compras/flujo', label: 'Flujo', icon: Waypoints },
  { href: '/dashboard/compras', label: 'Histórico OC', icon: History },
  { href: '/dashboard/compras/control-proveedores/candidatos', label: 'Cotización proveedores', icon: Search },
  { href: '/dashboard/compras/control-proveedores', label: 'Control', icon: ShieldCheck },
  { href: '/dashboard/compras/proveedores-360', label: 'Proveedor 360°', icon: Building2 },
  { href: '/dashboard/compras/inteligencia', label: 'Inteligencia', icon: BrainCircuit },
  { href: '/dashboard/compras/documentos', label: 'Documentos', icon: FileText },
];

export default function PurchasesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <section className="border-b border-border pb-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Abastecimiento</p>
          <p className="mt-1 text-sm text-muted-foreground">Una necesidad se convierte en comparación de proveedores, cotización, orden, recepción, inventario y costo trazable.</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Navegación de abastecimiento">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/dashboard/compras'
              ? pathname === item.href || pathname === '/dashboard/compras/importar-existencias'
              : item.href === '/dashboard/compras/control-proveedores'
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
