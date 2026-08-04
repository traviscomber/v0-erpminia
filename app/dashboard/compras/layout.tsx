'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, ShoppingCart, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard/compras', label: 'Órdenes de compra', icon: ShoppingCart },
  { href: '/dashboard/compras/importar-existencias', label: 'Importar existencias', icon: Upload },
  { href: '/dashboard/compras/documentos', label: 'Documentos', icon: FileText },
];

export default function PurchasesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <section className="border-b border-border pb-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Abastecimiento · Compras</p>
          <p className="mt-1 text-sm text-muted-foreground">Órdenes, importaciones y respaldo documental de abastecimiento.</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Navegación de compras">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/dashboard/compras'
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
