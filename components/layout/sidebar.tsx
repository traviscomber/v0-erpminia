'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  DollarSign,
  File,
  FileCheck,
  FolderOpen,
  Fuel,
  GraduationCap,
  HardHat,
  HelpCircle,
  Home,
  Leaf,
  LogOut,
  Menu,
  Plus,
  Scale,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  TreePine,
  Truck,
  Upload,
  Users,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useModuleAccess } from '@/hooks/use-module-access';

type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
  section?: string;
};

const groupOrder = [
  'General',
  'Operaciones',
  'Mantenimiento',
  'Abastecimiento',
  'Sostenibilidad y HSE',
  'Administración y control',
  'Ayuda',
];

const groupDescriptions: Record<string, string> = {
  General: 'Visión ejecutiva y alertas',
  Operaciones: 'Producción y telemetría',
  Mantenimiento: 'Trabajo, activos y desempeño',
  Abastecimiento: 'Inventario, compras y finanzas',
  'Sostenibilidad y HSE': 'Riesgos, ambiente y comunidad',
  'Administración y control': 'Legal, contratos y accesos',
  Ayuda: 'Soporte y aprendizaje',
};

const itemModuleKey: Record<string, string> = {
  Alertas: 'core_alertas',
  'Centros de Costos': 'core_centros_costos',
  Producción: 'prod_operaciones',
  'Telemetría de Sensores': 'prod_telemetria',
  Mantenimiento: 'mant_operaciones',
  'Mantenimiento por Centro de Costo': 'mant_operaciones',
  'Bitácora de Mantenimiento': 'mant_operaciones',
  'Planificación Preventiva': 'mant_operaciones',
  'Órdenes de Trabajo': 'mant_operaciones',
  Equipos: 'mant_operaciones',
  'Vehículos y Traslados': 'mant_operaciones',
  'Dashboard Gerencial Mantención': 'mant_gerencial',
  'Operación en Terreno': 'mant_gerencial',
  'Indicadores de Mantención': 'mant_gerencial',
  'Personal Mantención': 'mant_recursos',
  Combustible: 'mant_recursos',
  'Costo por Equipo': 'mant_recursos',
  'Gestión de Neumáticos': 'mant_recursos',
  'Componentes Mayores': 'mant_recursos',
  'Disponibilidad de Equipos': 'mant_gerencial',
  'Documentos Mantenimiento': 'mant_documentos',
  'Expedientes por Equipo': 'mant_documentos',
  'Fichas Técnicas': 'mant_documentos',
  'Bodega e Inventario': 'bodega_inventario',
  'Documentos Bodega': 'bodega_documentos',
  'Importar Existencias': 'bodega_inventario',
  'Tablero Sostenibilidad': 'sos_tablero',
  'Prevención de Riesgos': 'hse_riesgos',
  'Documentos Prevención': 'hse_documentacion',
  Capacitaciones: 'hse_capacitaciones',
  'Artículos EPP': 'hse_epp',
  'KPI Prevención': 'hse_kpls',
  Inspecciones: 'sos_calendario',
  'Carpeta de Arranque': 'sos_calendario',
  Calendario: 'sos_calendario',
  'Medio Ambiente': 'sos_medio_ambiente',
  Comunidades: 'sos_comunidades',
  'Flujo Documental': 'sos_documentos',
  'Reportería Documentos': 'sos_documentos',
  'Compras y OCs': 'fin_compras',
  'Documentos Compras': 'fin_compras',
  'Finanzas y Presupuesto': 'fin_finanzas',
  Proveedores: 'fin_finanzas',
  'Documentos Finanzas': 'fin_finanzas',
  'Reportes y Análisis': 'fin_reportes',
  'Módulo Legal': 'legal_modulo',
  'Documentos Legales': 'legal_modulo',
  'Gestión Documental': 'legal_contratos',
  Contratos: 'legal_contratos',
  'Empresas Contratistas (EECC)': 'legal_eecc',
};

const rolePermissions: Record<string, string[]> = {
  Inicio: ['superadmin', 'admin', 'manager', 'supervisor', 'viewer', 'jefe_mantencion'],
  Alertas: ['superadmin', 'admin', 'manager', 'supervisor', 'jefe_mantencion'],
  'Centros de Costos': ['superadmin', 'admin', 'manager', 'Operaciones-Supervisor', 'Finanzas-Supervisor', 'jefe_mantencion'],
  Producción: ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Telemetría de Sensores': ['superadmin', 'admin', 'Operaciones-Supervisor'],
  Mantenimiento: ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Mantenimiento por Centro de Costo': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Bitácora de Mantenimiento': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Planificación Preventiva': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Dashboard Gerencial Mantención': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Operación en Terreno': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  Equipos: ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Vehículos y Traslados': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Personal Mantención': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  Combustible: ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Costo por Equipo': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Indicadores de Mantención': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Gestión de Neumáticos': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Componentes Mayores': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Documentos Mantenimiento': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Expedientes por Equipo': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Fichas Técnicas': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Disponibilidad de Equipos': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Órdenes de Trabajo': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Bodega e Inventario': ['superadmin', 'admin', 'Bodega-Supervisor', 'jefe_mantencion'],
  'Documentos Bodega': ['superadmin', 'admin', 'Bodega-Supervisor', 'jefe_mantencion'],
  'Importar Existencias': ['superadmin', 'admin', 'Bodega-Supervisor', 'Compras-Supervisor'],
  'Gestión Documental': ['superadmin', 'admin', 'manager'],
  'Compras y OCs': ['superadmin', 'admin', 'Compras-Supervisor'],
  'Documentos Compras': ['superadmin', 'admin', 'Compras-Supervisor'],
  'Finanzas y Presupuesto': ['superadmin', 'admin', 'Finanzas-Supervisor'],
  Proveedores: ['superadmin', 'admin', 'Finanzas-Supervisor'],
  'Documentos Finanzas': ['superadmin', 'admin', 'Finanzas-Supervisor'],
  'Reportes y Análisis': ['superadmin', 'admin', 'manager', 'supervisor', 'jefe_mantencion'],
  'Gestión de Usuarios': ['superadmin', 'admin'],
  'Roles y Cargos': ['superadmin', 'admin'],
  'Módulo Legal': ['superadmin', 'admin', 'manager'],
  Contratos: ['superadmin', 'admin', 'manager'],
  'Empresas Contratistas (EECC)': ['superadmin', 'admin', 'manager'],
  'Guías de Uso': ['superadmin', 'admin', 'manager', 'supervisor', 'viewer', 'jefe_mantencion'],
  'Tablero Sostenibilidad': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor'],
  'Prevención de Riesgos': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor'],
  'Documentos Prevención': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor'],
  Capacitaciones: ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor', 'manager'],
  'Artículos EPP': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor', 'Bodega-Supervisor'],
  'KPI Prevención': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor', 'manager'],
  Inspecciones: ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor'],
  'Carpeta de Arranque': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor'],
  Calendario: ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor', 'manager', 'supervisor'],
  'Medio Ambiente': ['superadmin', 'admin', 'Sostenibilidad-Supervisor'],
  Comunidades: ['superadmin', 'admin', 'Sostenibilidad-Supervisor'],
  'Flujo Documental': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'manager'],
  'Reportería Documentos': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'manager'],
  'Documentos Legales': ['superadmin', 'admin', 'manager'],
};

const menuItems: MenuItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: Home, group: 'General' },
  { label: 'Alertas', href: '/dashboard/alertas', icon: Bell, group: 'General' },
  { label: 'Centros de Costos', href: '/dashboard/centros-costos', icon: Building2, group: 'General' },

  { label: 'Producción', href: '/dashboard/produccion', icon: Zap, group: 'Operaciones' },
  { label: 'Telemetría de Sensores', href: '/dashboard/telemetria', icon: Activity, group: 'Operaciones' },

  { label: 'Mantenimiento', href: '/dashboard/mantenimiento', icon: Wrench, group: 'Mantenimiento', section: 'Resumen' },
  { label: 'Órdenes de Trabajo', href: '/dashboard/mantenimiento/ordenes-trabajo', icon: Plus, group: 'Mantenimiento', section: 'Operación diaria' },
  { label: 'Planificación Preventiva', href: '/dashboard/mantenimiento/planificacion', icon: Calendar, group: 'Mantenimiento', section: 'Operación diaria' },
  { label: 'Bitácora de Mantenimiento', href: '/dashboard/mantenimiento/bitacora', icon: File, group: 'Mantenimiento', section: 'Operación diaria' },
  { label: 'Operación en Terreno', href: '/dashboard/mantenimiento/movil', icon: Smartphone, group: 'Mantenimiento', section: 'Operación diaria' },
  { label: 'Mantenimiento por Centro de Costo', href: '/dashboard/mantenimiento/centro-costo', icon: Building2, group: 'Mantenimiento', section: 'Operación diaria' },
  { label: 'Equipos', href: '/dashboard/mantenimiento/equipos', icon: Truck, group: 'Mantenimiento', section: 'Activos' },
  { label: 'Vehículos y Traslados', href: '/dashboard/mantenimiento/vehiculos', icon: Truck, group: 'Mantenimiento', section: 'Activos' },
  { label: 'Gestión de Neumáticos', href: '/dashboard/mantenimiento/neumaticos', icon: Boxes, group: 'Mantenimiento', section: 'Activos' },
  { label: 'Componentes Mayores', href: '/dashboard/mantenimiento/componentes-mayores', icon: Wrench, group: 'Mantenimiento', section: 'Activos' },
  { label: 'Disponibilidad de Equipos', href: '/dashboard/mantenimiento/disponibilidad', icon: Activity, group: 'Mantenimiento', section: 'Control' },
  { label: 'Personal Mantención', href: '/dashboard/mantenimiento/personal', icon: Users, group: 'Mantenimiento', section: 'Recursos y costos' },
  { label: 'Combustible', href: '/dashboard/mantenimiento/combustible', icon: Fuel, group: 'Mantenimiento', section: 'Recursos y costos' },
  { label: 'Costo por Equipo', href: '/dashboard/mantenimiento/costos', icon: DollarSign, group: 'Mantenimiento', section: 'Recursos y costos' },
  { label: 'Dashboard Gerencial Mantención', href: '/dashboard/mantenimiento/gerencial', icon: BarChart3, group: 'Mantenimiento', section: 'Control' },
  { label: 'Indicadores de Mantención', href: '/dashboard/mantenimiento/indicadores', icon: BarChart3, group: 'Mantenimiento', section: 'Control' },
  { label: 'Documentos Mantenimiento', href: '/dashboard/mantenimiento/documentos', icon: FolderOpen, group: 'Mantenimiento', section: 'Documentación' },
  { label: 'Expedientes por Equipo', href: '/dashboard/mantenimiento/documentos/expedientes', icon: FolderOpen, group: 'Mantenimiento', section: 'Documentación' },
  { label: 'Fichas Técnicas', href: '/dashboard/mantenimiento/fichas-tecnicas', icon: FileCheck, group: 'Mantenimiento', section: 'Documentación' },

  { label: 'Bodega e Inventario', href: '/dashboard/bodega', icon: Boxes, group: 'Abastecimiento', section: 'Inventario' },
  { label: 'Importar Existencias', href: '/dashboard/compras/importar-existencias', icon: Upload, group: 'Abastecimiento', section: 'Inventario' },
  { label: 'Documentos Bodega', href: '/dashboard/bodega/documentos', icon: File, group: 'Abastecimiento', section: 'Inventario' },
  { label: 'Compras y OCs', href: '/dashboard/compras', icon: ShoppingCart, group: 'Abastecimiento', section: 'Compras' },
  { label: 'Documentos Compras', href: '/dashboard/compras/documentos', icon: File, group: 'Abastecimiento', section: 'Compras' },
  { label: 'Finanzas y Presupuesto', href: '/dashboard/finanzas', icon: DollarSign, group: 'Abastecimiento', section: 'Finanzas' },
  { label: 'Proveedores', href: '/dashboard/finanzas/proveedores', icon: Building2, group: 'Abastecimiento', section: 'Finanzas' },
  { label: 'Documentos Finanzas', href: '/dashboard/finanzas/documentos', icon: File, group: 'Abastecimiento', section: 'Finanzas' },
  { label: 'Reportes y Análisis', href: '/dashboard/reportes', icon: BarChart3, group: 'Abastecimiento', section: 'Análisis' },

  { label: 'Tablero Sostenibilidad', href: '/dashboard/sostenibilidad', icon: Leaf, group: 'Sostenibilidad y HSE', section: 'Resumen' },
  { label: 'Prevención de Riesgos', href: '/dashboard/sostenibilidad/prevencion-riesgos', icon: Shield, group: 'Sostenibilidad y HSE', section: 'Seguridad y salud' },
  { label: 'Inspecciones', href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones', icon: ClipboardCheck, group: 'Sostenibilidad y HSE', section: 'Seguridad y salud' },
  { label: 'Capacitaciones', href: '/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones', icon: GraduationCap, group: 'Sostenibilidad y HSE', section: 'Seguridad y salud' },
  { label: 'Artículos EPP', href: '/dashboard/sostenibilidad/prevencion-riesgos/epp', icon: HardHat, group: 'Sostenibilidad y HSE', section: 'Seguridad y salud' },
  { label: 'KPI Prevención', href: '/dashboard/sostenibilidad/prevencion-riesgos/kpi', icon: Activity, group: 'Sostenibilidad y HSE', section: 'Seguridad y salud' },
  { label: 'Carpeta de Arranque', href: '/dashboard/sostenibilidad/prevencion-riesgos/carpeta-arranque', icon: FolderOpen, group: 'Sostenibilidad y HSE', section: 'Seguridad y salud' },
  { label: 'Documentos Prevención', href: '/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse', icon: File, group: 'Sostenibilidad y HSE', section: 'Documentación' },
  { label: 'Calendario', href: '/dashboard/sostenibilidad/calendario', icon: Calendar, group: 'Sostenibilidad y HSE', section: 'Gestión transversal' },
  { label: 'Medio Ambiente', href: '/dashboard/sostenibilidad/medio-ambiente', icon: TreePine, group: 'Sostenibilidad y HSE', section: 'Entorno' },
  { label: 'Comunidades', href: '/dashboard/sostenibilidad/comunidades', icon: Building2, group: 'Sostenibilidad y HSE', section: 'Entorno' },
  { label: 'Flujo Documental', href: '/dashboard/sostenibilidad/documentos-flujo', icon: FileCheck, group: 'Sostenibilidad y HSE', section: 'Documentación' },
  { label: 'Reportería Documentos', href: '/dashboard/sostenibilidad/documentos-reportes', icon: BarChart3, group: 'Sostenibilidad y HSE', section: 'Documentación' },

  { label: 'Módulo Legal', href: '/dashboard/legal', icon: Scale, group: 'Administración y control', section: 'Legal y contratos' },
  { label: 'Gestión Documental', href: '/dashboard/documentos-gestion', icon: FolderOpen, group: 'Administración y control', section: 'Legal y contratos' },
  { label: 'Contratos', href: '/dashboard/documentos-gestion/contratos', icon: FileCheck, group: 'Administración y control', section: 'Legal y contratos' },
  { label: 'Empresas Contratistas (EECC)', href: '/dashboard/documentos-gestion/eecc', icon: Building2, group: 'Administración y control', section: 'Legal y contratos' },
  { label: 'Documentos Legales', href: '/dashboard/legal/documentos', icon: File, group: 'Administración y control', section: 'Legal y contratos' },
  { label: 'Roles y Cargos', href: '/dashboard/admin/roles', icon: ShieldCheck, group: 'Administración y control', section: 'Accesos' },
  { label: 'Gestión de Usuarios', href: '/dashboard/admin/users', icon: Users, group: 'Administración y control', section: 'Accesos' },

  { label: 'Guías de Uso', href: '/dashboard/guias', icon: HelpCircle, group: 'Ayuda' },
];

function isItemActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout } = useAuth();
  const { enforced, canView } = useModuleAccess();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const filteredMenuItems = useMemo(() => {
    if (!role) return [];

    const applyMatrix = (items: MenuItem[]) => {
      if (!enforced) return items;
      return items.filter((item) => {
        const moduleKey = itemModuleKey[item.label];
        return !moduleKey || canView(moduleKey);
      });
    };

    if (role === 'superadmin' || role === 'admin') return menuItems;

    return applyMatrix(
      menuItems.filter((item) => (rolePermissions[item.label] || []).includes(role)),
    );
  }, [role, enforced, canView]);

  const activeGroup = useMemo(
    () => filteredMenuItems.find((item) => isItemActive(pathname, item.href))?.group,
    [filteredMenuItems, pathname],
  );

  useEffect(() => {
    if (!activeGroup) return;
    setExpandedGroups((current) => ({ ...current, [activeGroup]: true }));
  }, [activeGroup]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((current) => ({ ...current, [group]: !current[group] }));
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        aria-label={isOpen ? 'Cerrar navegación' : 'Abrir navegación'}
        className="fixed left-4 top-4 z-50 bg-background shadow-sm lg:hidden"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-screen w-[292px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-b border-sidebar-border px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">MOTIIL</p>
              <p className="truncate text-xs text-muted-foreground">Gestión operacional</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
          <div className="space-y-2">
            {groupOrder.map((group) => {
              const groupItems = filteredMenuItems.filter((item) => item.group === group);
              if (groupItems.length === 0) return null;

              const isExpanded = expandedGroups[group] ?? group === 'General';
              const sections = Array.from(new Set(groupItems.map((item) => item.section || '')));

              return (
                <section key={group} className="rounded-xl border border-transparent data-[active=true]:border-border/60 data-[active=true]:bg-muted/20" data-active={activeGroup === group}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{group}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{groupDescriptions[group]}</span>
                    </span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !isExpanded && '-rotate-90')} />
                  </button>

                  {isExpanded && (
                    <div className="space-y-3 px-2 pb-3 pt-1">
                      {sections.map((section) => {
                        const sectionItems = groupItems.filter((item) => (item.section || '') === section);
                        return (
                          <div key={section || group}>
                            {section && sections.length > 1 && (
                              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                                {section}
                              </p>
                            )}
                            <div className="space-y-0.5">
                              {sectionItems.map((item) => {
                                const Icon = item.icon;
                                const active = isItemActive(pathname, item.href);
                                return (
                                  <button
                                    type="button"
                                    key={item.href}
                                    onClick={() => handleNavigation(item.href)}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                      'flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                      active
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                    )}
                                  >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="rounded-xl bg-muted/35 p-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              className="mt-1 w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            Tecnología operacional por{' '}
            <a href="https://n3uralia.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-foreground">
              N3uralia
            </a>
          </p>
        </div>
      </aside>

      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
