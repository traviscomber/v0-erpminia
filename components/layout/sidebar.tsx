'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  ShoppingCart,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  Wrench,
  Boxes,
  Bell,
  Plus,
  HardHat,
  HelpCircle,
  Zap,
  Shield,
  FolderOpen,
  ChevronDown,
  Leaf,
  Calendar,
  Building2,
  Smartphone,
  ClipboardCheck,
  GraduationCap,
  Activity,
  Users,
  TreePine,
  FileCheck,
  Scale,
  File,
  Upload,
  Fuel,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useModuleAccess } from '@/hooks/use-module-access';

// Maps sidebar item labels to their HSE role-matrix module key.
// Items not listed here are not governed by the cargo matrix.
const itemModuleKey: Record<string, string> = {
  'Prevención de Riesgos': 'hse_riesgos',
  'Documentos Prevención': 'hse_documentacion',
  'Documentos HSE': 'hse_documentacion',
  Capacitaciones: 'hse_capacitaciones',
  'Artículos EPP': 'hse_epp',
  'KPI Prevención': 'hse_kpls',
  'Gestión Documental': 'contratos_visualizacion',
  Contratos: 'contratos_visualizacion',
  'Empresas Contratistas (EECC)': 'contratos_visualizacion',
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
  'Panel Móvil Mantención': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Personal Mantención': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Combustible': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Costo por Equipo': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Indicadores de Mantención': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Gestión de Neumáticos': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Componentes Mayores': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Documentos Mantenimiento': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Órdenes de Trabajo': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Maquinaria y Vehículos': ['superadmin', 'admin', 'Operaciones-Supervisor', 'jefe_mantencion'],
  'Bodega e Inventario': ['superadmin', 'admin', 'Bodega-Supervisor', 'jefe_mantencion'],
  'Documentos Bodega': ['superadmin', 'admin', 'Bodega-Supervisor', 'jefe_mantencion'],
  'Gestión Documental': ['superadmin', 'admin', 'manager'],
  'Compras y OCs': ['superadmin', 'admin', 'Compras-Supervisor'],
  'Documentos Compras': ['superadmin', 'admin', 'Compras-Supervisor'],
  'Finanzas y Presupuesto': ['superadmin', 'admin', 'Finanzas-Supervisor'],
  'Documentos Finanzas': ['superadmin', 'admin', 'Finanzas-Supervisor'],
  'Reportes y Análisis': ['superadmin', 'admin', 'manager', 'supervisor', 'jefe_mantencion'],
  'IA Operacional Minera': ['superadmin', 'admin'],
  'Tablero de KPIs': ['superadmin', 'admin', 'manager'],
  'Gestión de Usuarios': ['superadmin', 'admin'],
  'Gestión de Permisos': ['superadmin', 'admin'],
  'Roles y Cargos': ['superadmin', 'admin'],
  'Módulo Legal': ['superadmin', 'admin', 'manager'],
  'Gestión Documental': ['superadmin', 'admin', 'manager'],
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
  'Documentos HSE': ['superadmin', 'admin', 'HSE-Supervisor', 'Sostenibilidad-Supervisor'],
  'Documentos Legales': ['superadmin', 'admin', 'manager'],
};

const menuItems = [
  { label: 'Inicio', href: '/dashboard', icon: BarChart3, group: 'Core' },
  { label: 'Alertas', href: '/dashboard/alertas', icon: Bell, badge: 3, group: 'Core' },
  { label: 'Centros de Costos', href: '/dashboard/centros-costos', icon: Building2, group: 'Core' },
  { label: 'Producción', href: '/dashboard/produccion', icon: Zap, group: 'Producción' },
  { label: 'Telemetría de Sensores', href: '/dashboard/telemetria', icon: Activity, group: 'Producción' },
  { label: 'Mantenimiento', href: '/dashboard/mantenimiento', icon: Wrench, group: 'Mantenimiento' },
  { label: 'Mantenimiento por Centro de Costo', href: '/dashboard/mantenimiento/centro-costo', icon: Wrench, group: 'Mantenimiento' },
  { label: 'Bitácora de Mantenimiento', href: '/dashboard/mantenimiento/bitacora', icon: File, group: 'Mantenimiento' },
  { label: 'Planificación Preventiva', href: '/dashboard/mantenimiento/planificacion', icon: Calendar, group: 'Mantenimiento' },
  { label: 'Dashboard Gerencial Mantención', href: '/dashboard/mantenimiento/gerencial', icon: BarChart3, group: 'Mantenimiento' },
  { label: 'Panel Móvil Mantención', href: '/dashboard/mantenimiento/movil', icon: Smartphone, group: 'Mantenimiento' },
  { label: 'Personal Mantención', href: '/dashboard/mantenimiento/personal', icon: Users, group: 'Mantenimiento' },
  { label: 'Combustible', href: '/dashboard/mantenimiento/combustible', icon: Fuel, group: 'Mantenimiento' },
  { label: 'Costo por Equipo', href: '/dashboard/mantenimiento/costos', icon: DollarSign, group: 'Mantenimiento' },
  { label: 'Indicadores de Mantención', href: '/dashboard/mantenimiento/indicadores', icon: BarChart3, group: 'Mantenimiento' },
  { label: 'Gestión de Neumáticos', href: '/dashboard/mantenimiento/neumaticos', icon: Boxes, group: 'Mantenimiento' },
  { label: 'Componentes Mayores', href: '/dashboard/mantenimiento/componentes-mayores', icon: Wrench, group: 'Mantenimiento' },
  { label: 'Documentos Mantenimiento', href: '/dashboard/mantenimiento/documentos', icon: File, group: 'Mantenimiento' },
  { label: 'Maquinaria y Vehículos', href: '/dashboard/maquinaria', icon: Truck, group: 'Mantenimiento' },
  { label: 'Órdenes de Trabajo', href: '/dashboard/work-orders', icon: Plus, group: 'Operaciones' },
  { label: 'Bodega e Inventario', href: '/dashboard/bodega', icon: Boxes, group: 'Bodega e Inventario' },
  { label: 'Documentos Bodega', href: '/dashboard/bodega/documentos', icon: File, group: 'Bodega e Inventario' },
  { label: 'Tablero Sostenibilidad', href: '/dashboard/sostenibilidad', icon: Leaf, group: 'Sostenibilidad' },
  { label: 'Prevención de Riesgos', href: '/dashboard/sostenibilidad/prevencion-riesgos', icon: Shield, group: 'Sostenibilidad' },
  { label: 'Documentos Prevención', href: '/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse', icon: File, group: 'Sostenibilidad' },
  { label: 'Capacitaciones', href: '/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones', icon: GraduationCap, group: 'Sostenibilidad' },
  { label: 'Artículos EPP', href: '/dashboard/sostenibilidad/prevencion-riesgos/epp', icon: HardHat, group: 'Sostenibilidad' },
  { label: 'KPI Prevención', href: '/dashboard/sostenibilidad/prevencion-riesgos/kpi', icon: Activity, group: 'Sostenibilidad' },
  { label: 'Inspecciones', href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones', icon: ClipboardCheck, group: 'Sostenibilidad' },
  { label: 'Carpeta de Arranque', href: '/dashboard/sostenibilidad/prevencion-riesgos/carpeta-arranque', icon: FolderOpen, group: 'Sostenibilidad' },
  { label: 'Calendario', href: '/dashboard/sostenibilidad/calendario', icon: Calendar, group: 'Sostenibilidad' },
  { label: 'Medio Ambiente', href: '/dashboard/sostenibilidad/medio-ambiente', icon: TreePine, group: 'Sostenibilidad' },
  { label: 'Comunidades', href: '/dashboard/sostenibilidad/comunidades', icon: Building2, group: 'Sostenibilidad' },
  { label: 'Flujo Documental', href: '/dashboard/sostenibilidad/documentos-flujo', icon: FileCheck, group: 'Sostenibilidad' },
  { label: 'Reportería Documentos', href: '/dashboard/sostenibilidad/documentos-reportes', icon: BarChart3, group: 'Sostenibilidad' },
  { label: 'Compras y OCs', href: '/dashboard/compras', icon: ShoppingCart, group: 'Finanzas' },
  { label: 'Importar Existencias', href: '/dashboard/compras/importar-existencias', icon: Upload, group: 'Finanzas' },
  { label: 'Documentos Compras', href: '/dashboard/compras/documentos', icon: File, group: 'Finanzas' },
  { label: 'Finanzas y Presupuesto', href: '/dashboard/finanzas', icon: DollarSign, group: 'Finanzas' },
  { label: 'Documentos Finanzas', href: '/dashboard/finanzas/documentos', icon: File, group: 'Finanzas' },
  { label: 'Reportes y Análisis', href: '/dashboard/reportes', icon: BarChart3, group: 'Finanzas' },
  { label: 'Módulo Legal', href: '/dashboard/legal', icon: Scale, group: 'Legal' },
  { label: 'Gestión Documental', href: '/dashboard/documentos-gestion', icon: FolderOpen, group: 'Legal' },
  { label: 'Contratos', href: '/dashboard/documentos-gestion/contratos', icon: FileCheck, group: 'Legal' },
  { label: 'Empresas Contratistas (EECC)', href: '/dashboard/documentos-gestion/eecc', icon: Building2, group: 'Legal' },
  { label: 'Documentos Legales', href: '/dashboard/legal/documentos', icon: File, group: 'Legal' },
  { label: 'HSE', href: '/dashboard/hse', icon: Shield, group: 'HSE' },
  { label: 'Documentos HSE', href: '/dashboard/hse/documentos', icon: File, group: 'HSE' },
  { label: 'Roles y Cargos', href: '/dashboard/admin/roles', icon: ShieldCheck, group: 'Administración' },
  { label: 'Guías de Uso', href: '/dashboard/guias', icon: HelpCircle, group: 'Ayuda' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout } = useAuth();
  const { enforced, canView } = useModuleAccess();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Core: true,
    Producción: true,
    Operaciones: true,
    Mantenimiento: true,
    'Bodega e Inventario': true,
    Sostenibilidad: true,
    Finanzas: true,
    Legal: true,
    HSE: true,
    'Inteligencia Artificial': true,
    Administración: true,
    Ayuda: true,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredMenuItems = useMemo(() => {
    if (!role) return [];

    // Applies the cargo role-matrix on top of the base role filter.
    // Only active for non-admin users who have a cargo assigned (enforced).
    const applyMatrix = (items: typeof menuItems) => {
      if (!enforced) return items;
      return items.filter((item) => {
        const moduleKey = itemModuleKey[item.label];
        if (!moduleKey) return true; // not governed by the matrix
        return canView(moduleKey);
      });
    };

    if (role === 'superadmin' || role === 'admin') {
      return menuItems;
    }

    const base = menuItems.filter((item) => {
      const allowedRoles = rolePermissions[item.label] || [];
      return allowedRoles.includes(role);
    });

    return applyMatrix(base);
  }, [role, enforced, canView]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-40',
          'lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <svg viewBox="0 0 200 70" className="w-32 h-auto" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M 40 45 L 50 30 L 60 38 L 75 20 L 95 35 L 120 15 L 140 30 L 160 25"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x="40" y="60" fontSize="16" fontWeight="bold" fill="currentColor" className="dark:text-orange-400 text-orange-600">
                LA
              </text>
              <text x="85" y="60" fontSize="16" fontWeight="bold" fill="currentColor" className="dark:text-orange-400 text-orange-600">
                PATAGUA
              </text>
            </svg>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {['Core', 'Producción', 'Operaciones', 'Mantenimiento', 'Bodega e Inventario', 'Sostenibilidad', 'Finanzas', 'Legal', 'Inteligencia Artificial', 'Administración', 'Ayuda'].map(
              (group) => {
                const groupItems = filteredMenuItems.filter((item) => item.group === group);
                if (groupItems.length === 0) return null;
                const isExpanded = expandedGroups[group] ?? false;
                const sortedGroupItems = [...groupItems].sort((a, b) => {
                  const aInicio = a.label.toLowerCase().startsWith('dashboard');
                  const bInicio = b.label.toLowerCase().startsWith('dashboard');

                  if (aInicio !== bInicio) {
                    return aInicio ? -1 : 1;
                  }

                  return a.label.localeCompare(b.label, 'es');
                });

                return (
                  <div key={group}>
                    <button
                      onClick={() => toggleGroup(group)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50 rounded-md transition-colors"
                    >
                      <span>{group}</span>
                      <ChevronDown
                        className={cn('w-4 h-4 transition-transform duration-200', isExpanded ? 'rotate-0' : '-rotate-90')}
                      />
                    </button>
                    <div
                      className={cn(
                        'space-y-1 overflow-hidden transition-all duration-200',
                        isExpanded ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                      )}
                    >
                      {sortedGroupItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                          <Button
                            key={item.href}
                            variant={isActive ? 'default' : 'ghost'}
                            className="w-full justify-start gap-3 relative"
                            onClick={() => handleNavigation(item.href)}
                          >
                            <Icon className="w-5 h-5" />
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-destructive text-white text-xs flex items-center justify-center font-semibold">
                                {item.badge}
                              </span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-4 space-y-2">
          <ThemeToggle />
          <Button variant="outline" className="w-full justify-start gap-3 hover:bg-sidebar-accent/20 transition-colors">
            <Settings className="w-5 h-5" />
            <span>Configuracion</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={logout}
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar sesión</span>
          </Button>

          <div className="border-t border-sidebar-border pt-4 mt-4">
            <p className="text-xs text-sidebar-accent-foreground text-center mb-2">Powered by</p>
            <a
              href="https://n3uralia.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs font-semibold text-sidebar-primary hover:text-sidebar-primary/80 transition-colors"
            >
              n3uralia
            </a>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
