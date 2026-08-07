'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Calendar, CalendarRange, ClipboardCheck, FileText, GitBranch, MessageSquareText, Repeat2, Settings, Wrench, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard/mantenimiento', label: 'Resumen', icon: Wrench },
  { href: '/dashboard/mantenimiento/ordenes-trabajo', label: 'Órdenes', icon: ClipboardList },
  { href: '/dashboard/mantenimiento/planificacion', label: 'Planificación', icon: Calendar },
  { href: '/dashboard/mantenimiento/campanas', label: 'Campañas', icon: CalendarRange },
  { href: '/dashboard/mantenimiento/confiabilidad', label: 'Confiabilidad', icon: Repeat2 },
  { href: '/dashboard/mantenimiento/bom', label: 'BOM técnica', icon: GitBranch },
  { href: '/dashboard/mantenimiento/planes-estandar', label: 'Planes estándar', icon: ClipboardCheck },
  { href: '/dashboard/mantenimiento/retroalimentacion-renovacion', label: 'Retroalimentación', icon: MessageSquareText },
  { href: '/dashboard/mantenimiento/aplicacion-retroalimentacion', label: 'Aplicación', icon: ClipboardCheck },
  { href: '/dashboard/mantenimiento/aprobacion-retroalimentacion', label: 'Aprobación', icon: ClipboardCheck },
  { href: '/dashboard/mantenimiento/verificacion-retroalimentacion', label: 'Verificación', icon: ClipboardCheck },
  { href: '/dashboard/mantenimiento/seguimiento-excepciones', label: 'Seguimiento', icon: ClipboardCheck },
  { href: '/dashboard/mantenimiento/equipos', label: 'Activos', icon: Settings },
  { href: '/dashboard/mantenimiento/indicadores', label: 'Indicadores', icon: BarChart3 },
  { href: '/dashboard/mantenimiento/documentos', label: 'Documentos', icon: FileText },
];

const assetViewPrefixes = ['/dashboard/mantenimiento/disponibilidad','/dashboard/mantenimiento/costos','/dashboard/mantenimiento/neumaticos','/dashboard/mantenimiento/componentes-mayores','/dashboard/mantenimiento/fichas-tecnicas','/dashboard/mantenimiento/documentos/expedientes','/dashboard/mantenimiento/centro-costo','/dashboard/mantenimiento/vehiculos'];

export default function MaintenanceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className="space-y-5"><section className="border-b border-border pb-4"><div className="mb-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mantenimiento</p><p className="mt-1 text-sm text-muted-foreground">Trabajo, activos, control y documentación en un flujo único.</p></div><nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Navegación de mantenimiento">{items.map((item)=>{const Icon=item.icon;const isAssetContext=item.href==='/dashboard/mantenimiento/equipos'&&assetViewPrefixes.some((prefix)=>pathname===prefix||pathname.startsWith(`${prefix}/`));const active=item.href==='/dashboard/mantenimiento'?pathname===item.href:isAssetContext||pathname===item.href||pathname.startsWith(`${item.href}/`);return <Link key={item.href} href={item.href} className={cn('inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',active?'border-primary bg-primary text-primary-foreground':'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground')}><Icon className="h-4 w-4"/>{item.label}</Link>;})}</nav></section>{children}</div>;
}
