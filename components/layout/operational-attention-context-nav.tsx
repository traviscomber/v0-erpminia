'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard/planificacion', label: 'Planificación' },
  { href: '/dashboard/planificacion/asistente', label: 'Asistente Ariel' },
  { href: '/dashboard/planificacion/datos', label: 'Data de Ariel' },
  { href: '/dashboard/alertas', label: 'Alertas' },
  { href: '/dashboard/andon', label: 'Problemas' },
];

export function OperationalAttentionContextNav() {
  const pathname = usePathname();
  const visible = items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (!visible) return null;

  return (
    <section className="border-b border-border bg-background" aria-label="Atención operacional">
      <div className="flex min-h-11 items-stretch overflow-x-auto px-4 [scrollbar-width:none] md:px-6 xl:px-8 [&::-webkit-scrollbar]:hidden">
        <span className="flex shrink-0 items-center pr-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
          Atención operacional
        </span>
        <nav className="flex items-stretch" aria-label="Contextos de Atención operacional">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative inline-flex min-h-11 shrink-0 items-center px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="whitespace-nowrap">{item.label}</span>
                {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
