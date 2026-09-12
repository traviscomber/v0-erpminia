'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard/decisiones', label: 'Centro ejecutivo' },
  { href: '/dashboard/desempeno', label: 'Desempeño' },
  { href: '/dashboard/calidad-datos/salud', label: 'Data Health' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ManagementContextNav() {
  const pathname = usePathname();

  return (
    <section className="border-b border-border" aria-label="Contexto de Gerencia">
      <div className="flex min-h-12 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="flex shrink-0 items-center px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
          Gerencia
        </span>
        <nav className="flex items-stretch" aria-label="Navegación gerencial">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative inline-flex min-h-12 shrink-0 items-center px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="whitespace-nowrap">{item.label}</span>
                {active ? <span className="absolute inset-x-2.5 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
