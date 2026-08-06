'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  Columns3,
  FileText,
  Home,
  Lightbulb,
  Route,
  Search,
  Shield,
  ShoppingCart,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';

const destinations = [
  { group: 'General', label: 'Inicio', keywords: 'dashboard resumen ejecutivo', href: '/dashboard', icon: Home },
  { group: 'Control y mejora', label: 'Centro de gestión', keywords: 'control operacional circuito lean andon kanban kaizen pendientes', href: '/dashboard/lean', icon: Route },
  { group: 'Control y mejora', label: 'Revisión diaria', keywords: 'daily management lean reunion diaria gemba control operacional', href: '/dashboard/daily-management', icon: CalendarDays },
  { group: 'Control y mejora', label: 'Alertas operacionales', keywords: 'andon desviaciones alertas causa principal accion respuesta', href: '/dashboard/andon', icon: AlertTriangle },
  { group: 'Control y mejora', label: 'Flujo de trabajo', keywords: 'kanban trabajo limite pendientes bloqueos antiguedad', href: '/dashboard/kanban', icon: Columns3 },
  { group: 'Control y mejora', label: 'Mejoras y seguimiento', keywords: 'kaizen pdca mejora continua comprobar aplicar estandarizar ahorro', href: '/dashboard/kaizen', icon: Lightbulb },
  { group: 'General', label: 'Alertas', keywords: 'riesgos prioridades avisos', href: '/dashboard/alertas', icon: Bell },
  { group: 'General', label: 'Acciones pendientes', keywords: 'tareas pendientes acciones compromisos', href: '/dashboard/tareas', icon: ClipboardList },
  { group: 'General', label: 'Centros de costos', keywords: 'costos estructura imputacion', href: '/dashboard/centros-costos', icon: Building2 },
  { group: 'Operaciones', label: 'Producción', keywords: 'operaciones rendimiento turnos', href: '/dashboard/produccion', icon: Activity },
  { group: 'Operaciones', label: 'Monitoreo de equipos', keywords: 'telemetria sensores monitoreo equipos', href: '/dashboard/telemetria', icon: Activity },
  { group: 'Mantenimiento', label: 'Mantenimiento', keywords: 'mantencion activos', href: '/dashboard/mantenimiento', icon: Wrench },
  { group: 'Mantenimiento', label: 'Órdenes de trabajo', keywords: 'ot tareas trabajo', href: '/dashboard/mantenimiento/ordenes-trabajo', icon: ClipboardList },
  { group: 'Mantenimiento', label: 'Planificación preventiva', keywords: 'calendario plan preventivo', href: '/dashboard/mantenimiento/planificacion', icon: CalendarDays },
  { group: 'Abastecimiento', label: 'Bodega e inventario', keywords: 'stock materiales existencias', href: '/dashboard/bodega', icon: Boxes },
  { group: 'Abastecimiento', label: 'Compras y órdenes de compra', keywords: 'compras oc requerimientos', href: '/dashboard/compras', icon: ShoppingCart },
  { group: 'Seguridad y sostenibilidad', label: 'Seguridad y sostenibilidad', keywords: 'hse seguridad ambiente riesgos', href: '/dashboard/sostenibilidad', icon: Shield },
  { group: 'Seguridad y sostenibilidad', label: 'Calendario de compromisos', keywords: 'agenda fechas compromisos', href: '/dashboard/sostenibilidad/calendario', icon: CalendarDays },
  { group: 'Administración', label: 'Gestión documental', keywords: 'documentos contratos archivos', href: '/dashboard/documentos-gestion', icon: FileText },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const goTo = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="hidden min-w-44 justify-start gap-2 border border-border/70 text-muted-foreground hover:text-foreground md:inline-flex"
        onClick={() => setOpen(true)}
        aria-label="Ir a una sección de Motil"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Ir a…</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Ir a una sección de Motil"
      >
        <Search className="h-4 w-4" />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Ir a una sección"
        description="Busca un área de trabajo de Motil"
        className="max-w-xl"
        showCloseButton={false}
      >
        <CommandInput placeholder="Buscar sección o tarea..." />
        <CommandList>
          <CommandEmpty>No se encontró una sección.</CommandEmpty>
          {Array.from(new Set(destinations.map((item) => item.group))).map((group) => (
            <CommandGroup key={group} heading={group}>
              {destinations.filter((item) => item.group === group).map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    value={`${item.label} ${item.keywords}`}
                    onSelect={() => goTo(item.href)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>Áreas de trabajo disponibles</span>
          <CommandShortcut>ESC para cerrar</CommandShortcut>
        </div>
      </CommandDialog>
    </>
  );
}
