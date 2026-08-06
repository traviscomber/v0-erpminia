'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ChevronRight,
  ClipboardList,
  Ellipsis,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GlobalSearch } from '@/components/layout/global-search';
import { useAuth } from '@/hooks/use-auth';

const routeLabels: Record<string, string> = {
  dashboard: 'Inicio',
  alertas: 'Alertas',
  tareas: 'Tasks',
  produccion: 'Producción',
  telemetria: 'Telemetría',
  'centros-costos': 'Centros de costos',
  mantenimiento: 'Mantenimiento',
  'ordenes-trabajo': 'Órdenes de trabajo',
  planificacion: 'Planificación preventiva',
  bitacora: 'Bitácora',
  movil: 'Operación en terreno',
  'centro-costo': 'Por centro de costo',
  equipos: 'Equipos',
  vehiculos: 'Vehículos',
  neumaticos: 'Neumáticos',
  'componentes-mayores': 'Componentes mayores',
  disponibilidad: 'Disponibilidad',
  personal: 'Personal',
  combustible: 'Combustible',
  costos: 'Costos por equipo',
  indicadores: 'Indicadores',
  gerencial: 'Control gerencial',
  documentos: 'Documentos',
  expedientes: 'Expedientes',
  'fichas-tecnicas': 'Fichas técnicas',
  bodega: 'Inventario',
  compras: 'Compras',
  finanzas: 'Finanzas',
  proveedores: 'Proveedores',
  reportes: 'Reportes',
  sostenibilidad: 'Sostenibilidad y HSE',
  'prevencion-riesgos': 'Prevención de riesgos',
  capacitaciones: 'Capacitaciones',
  epp: 'EPP',
  inspecciones: 'Inspecciones',
  'carpeta-arranque': 'Carpeta de arranque',
  calendario: 'Calendario',
  'medio-ambiente': 'Medio ambiente',
  comunidades: 'Comunidades',
  legal: 'Legal y contratos',
  'documentos-gestion': 'Gestión documental',
  contratos: 'Contratos',
  eecc: 'Empresas contratistas',
  admin: 'Administración',
  users: 'Usuarios',
  roles: 'Roles y cargos',
  guias: 'Ayuda',
};

const technicalSegmentPattern = /^(?:[0-9a-f]{8}-[0-9a-f-]{27,}|\d{5,}|[0-9a-f]{20,})$/i;

function formatSegment(segment: string) {
  if (technicalSegmentPattern.test(segment)) return 'Detalle';
  return routeLabels[segment] || segment.replaceAll('-', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

type HeaderProps = {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

export function Header({ sidebarCollapsed = false, onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const canAdminister = role === 'admin' || role === 'superadmin';

  const segments = pathname.split('/').filter(Boolean);
  const dashboardIndex = segments.indexOf('dashboard');
  const visibleSegments = dashboardIndex >= 0 ? segments.slice(dashboardIndex) : segments;
  const allBreadcrumbs = visibleSegments.map((segment, index) => ({
    label: formatSegment(segment),
    href: `/${segments.slice(0, dashboardIndex + index + 1).join('/')}`,
    current: index === visibleSegments.length - 1,
  }));
  const breadcrumbs =
    allBreadcrumbs.length > 4
      ? [
          allBreadcrumbs[0],
          { label: '…', href: '', current: false, collapsed: true },
          ...allBreadcrumbs.slice(-2),
        ]
      : allBreadcrumbs;
  const sidebarAction = sidebarCollapsed ? 'Mostrar menú' : 'Ocultar menú';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/88">
      <div className="flex h-14 items-center justify-between gap-4 px-4 pl-16 md:px-6 lg:pl-6">
        <div className="flex min-w-0 items-center gap-3">
          {onToggleSidebar ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              aria-label={sidebarAction}
              title={sidebarAction}
              className="hidden shrink-0 gap-2 text-muted-foreground hover:text-foreground lg:inline-flex"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              <span className="hidden 2xl:inline">{sidebarAction}</span>
            </Button>
          ) : null}

          <nav aria-label="Ruta de navegación" className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((item, index) => (
              <div key={`${item.href}-${index}`} className="flex min-w-0 items-center gap-1">
                {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />}
                {'collapsed' in item && item.collapsed ? (
                  <span className="flex h-5 w-5 items-center justify-center" aria-label="Niveles intermedios omitidos">
                    <Ellipsis className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                ) : item.current ? (
                  <span className="truncate font-medium text-foreground" aria-current="page">{item.label}</span>
                ) : (
                  <Link href={item.href} className="truncate transition-colors hover:text-foreground">{item.label}</Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <GlobalSearch />
          <Button asChild variant="ghost" size="icon-sm" aria-label="Ver tasks">
            <Link href="/dashboard/tareas"><ClipboardList className="h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm" aria-label="Ver alertas">
            <Link href="/dashboard/alertas"><Bell className="h-4 w-4" /></Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:px-2.5" aria-label="Abrir menú de usuario">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-primary">
                  <User className="h-3.5 w-3.5 text-sidebar-primary-foreground" />
                </div>
                <div className="hidden max-w-36 text-left lg:block">
                  <p className="truncate text-xs font-medium">{user?.name || user?.email || 'Usuario'}</p>
                  <p className="truncate text-[11px] capitalize text-muted-foreground">{role || 'Sin rol'}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <div className="px-2 py-1.5 lg:hidden">
                <p className="truncate text-sm font-medium">{user?.name || user?.email || 'Usuario'}</p>
                <p className="truncate text-xs capitalize text-muted-foreground">{role || 'Sin rol'}</p>
              </div>
              <DropdownMenuSeparator className="lg:hidden" />
              {canAdminister ? (
                <DropdownMenuItem asChild className="cursor-pointer gap-2">
                  <Link href="/dashboard/admin"><Settings className="h-4 w-4" />Centro de administración</Link>
                </DropdownMenuItem>
              ) : null}
              {canAdminister ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={logout}>
                <LogOut className="h-4 w-4" />Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
