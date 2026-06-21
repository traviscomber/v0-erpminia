'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  ShoppingCart,
  Package,
  FileText,
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
  AlertTriangle,
  Cpu,
  HelpCircle,
  Network,
  Zap,
  Shield,
  FolderOpen,
  ChevronDown,
  Users,
  Leaf,
  Calendar,
  Building2,
  ClipboardCheck,
  GraduationCap,
  HardHat as HelmetIcon,
  Activity,
  TreePine,
  FileCheck,
  Scale,
  File,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

// Define permitted roles for each module
const rolePermissions: Record<string, string[]> = {
  'Inicio': ['superadmin', 'admin', 'manager', 'supervisor', 'viewer'],
  'Alertas': ['superadmin', 'admin', 'manager', 'supervisor'],
  'Centros de Costos': ['superadmin', 'admin', 'manager', 'Operaciones-Supervisor', 'Finanzas-Supervisor'],
  'Producción': ['superadmin', 'admin', 'Operaciones-Supervisor'],
  'Mantenimiento': ['superadmin', 'admin', 'Operaciones-Supervisor'],
  'Mantenimiento por Centro de Costo': ['superadmin', 'admin', 'Operaciones-Supervisor'],
  'Ordenes de Trabajo': ['superadmin', 'admin', 'Operaciones-Supervisor'],
  'Bodega e Inventario': ['superadmin', 'admin', 'Bodega-Supervisor'],
  'Gestión Documental': ['superadmin', 'admin', 'manager'],
  'Compras y OCs': ['superadmin', 'admin', 'Compras-Supervisor'],
  'Finanzas y Presupuesto': ['superadmin', 'admin', 'Finanzas-Supervisor'],
  'Reportes y Análisis': ['superadmin', 'admin', 'manager', 'supervisor'],
  'IA Operacional Minera': ['superadmin', 'admin'],
  'Tablero de KPIs': ['superadmin', 'admin', 'manager'],
  'Gestión de Usuarios': ['superadmin', 'admin'],
  'Gestión de Permisos': ['superadmin', 'admin'],
  'Módulo Legal': ['superadmin', 'admin', 'manager'],
  'Guías de Uso': ['superadmin', 'admin', 'manager', 'supervisor', 'viewer'],
  // Sostenibilidad - Transversal (all 12 modules)
  'Tablero Sostenibilidad': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor'],
  'Prevencion de Riesgos': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor'],
  'Capacitaciones': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor', 'manager'],
  'Articulos EPP': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor', 'Bodega-Supervisor'],
  'KPI Prevencion': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor', 'manager'],
  'Inspecciones': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor'],
  'Carpeta de Arranque': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor'],
  'Calendario': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor', 'manager', 'supervisor'],
  'Medio Ambiente': ['superadmin', 'admin', 'Sostenibilidad-Supervisor'],
  'Comunidades': ['superadmin', 'admin', 'Sostenibilidad-Supervisor'],
  'Flujo Documental': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'manager'],
  // Documentos por módulo
  'Documentos Mantenimiento': ['superadmin', 'admin', 'Operaciones-Supervisor'],
  'Documentos Bodega': ['superadmin', 'admin', 'Bodega-Supervisor'],
  'Documentos Compras': ['superadmin', 'admin', 'Compras-Supervisor'],
  'Documentos Finanzas': ['superadmin', 'admin', 'Finanzas-Supervisor'],
  'Documentos HSE': ['superadmin', 'admin', 'HSE-Supervisor', 'Sostenibilidad-Supervisor'],
  'Documentos Legal': ['superadmin', 'admin', 'manager'],
  'Documentos Prevención': ['superadmin', 'admin', 'Sostenibilidad-Supervisor', 'HSE-Supervisor'],
};

const menuItems = [
  // CORE - Inicio Principal
  {
    label: 'Inicio',
    href: '/dashboard',
    icon: BarChart3,
    group: 'Core',
  },
  {
    label: 'Alertas',
    href: '/dashboard/alertas',
    icon: Bell,
    badge: 3,
    group: 'Core',
  },
  {
    label: 'Centros de Costos',
    href: '/dashboard/centros-costos',
    icon: Building2,
    group: 'Core',
  },
  
  // OPERACIONES - Depto. Operaciones
  {
    label: 'Producción',
    href: '/dashboard/produccion',
    icon: Zap,
    group: 'Producción',
  },
  {
    label: 'Mantenimiento',
    href: '/dashboard/mantenimiento',
    icon: Wrench,
    group: 'Mantenimiento',
  },
  {
    label: 'Mantenimiento por Centro de Costo',
    href: '/dashboard/mantenimiento/centro-costo',
    icon: Wrench,
    group: 'Mantenimiento',
  },
  {
    label: 'Documentos Mantenimiento',
    href: '/dashboard/mantenimiento/documentos',
    icon: File,
    group: 'Mantenimiento',
  },
  {
    label: 'Ordenes de Trabajo',
    href: '/dashboard/work-orders',
    icon: Plus,
    group: 'Operaciones',
  },
  {
    label: 'Bodega e Inventario',
    href: '/dashboard/bodega',
    icon: Boxes,
    group: 'Bodega e Inventario',
  },
  {
    label: 'Documentos Bodega',
    href: '/dashboard/bodega/documentos',
    icon: File,
    group: 'Bodega e Inventario',
  },
  
  // SOSTENIBILIDAD - Transversal (4 Pilares, 12 Módulos)
  {
    label: 'Tablero Sostenibilidad',
    href: '/dashboard/sostenibilidad',
    icon: Leaf,
    group: 'Sostenibilidad',
  },
  {
    label: 'Prevencion de Riesgos',
    href: '/dashboard/sostenibilidad/prevencion-riesgos',
    icon: Shield,
    group: 'Sostenibilidad',
  },
  {
    label: 'Documentos Prevención',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse',
    icon: File,
    group: 'Sostenibilidad',
  },
  {
    label: 'Capacitaciones',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones',
    icon: GraduationCap,
    group: 'Sostenibilidad',
  },
  {
    label: 'Articulos EPP',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/epp',
    icon: HardHat,
    group: 'Sostenibilidad',
  },
  {
    label: 'KPI Prevencion',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/kpi',
    icon: Activity,
    group: 'Sostenibilidad',
  },
  {
    label: 'Inspecciones',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones',
    icon: ClipboardCheck,
    group: 'Sostenibilidad',
  },
  {
    label: 'Carpeta de Arranque',
    href: '/dashboard/sostenibilidad/prevencion-riesgos/carpeta-arranque',
    icon: FolderOpen,
    group: 'Sostenibilidad',
  },
  {
    label: 'Calendario',
    href: '/dashboard/sostenibilidad/calendario',
    icon: Calendar,
    group: 'Sostenibilidad',
  },
  {
    label: 'Medio Ambiente',
    href: '/dashboard/sostenibilidad/medio-ambiente',
    icon: TreePine,
    group: 'Sostenibilidad',
  },
  {
    label: 'Comunidades',
    href: '/dashboard/sostenibilidad/comunidades',
    icon: Building2,
    group: 'Sostenibilidad',
  },
  {
    label: 'Flujo Documental',
    href: '/dashboard/sostenibilidad/documentos-flujo',
    icon: FileCheck,
    group: 'Sostenibilidad',
  },
  {
    label: 'Reportería Documentos',
    href: '/dashboard/sostenibilidad/documentos-reportes',
    icon: BarChart3,
    group: 'Sostenibilidad',
  },
  
  // FINANZAS
  {
    label: 'Compras y OCs',
    href: '/dashboard/compras',
    icon: ShoppingCart,
    group: 'Finanzas',
  },
  {
    label: 'Documentos Compras',
    href: '/dashboard/compras/documentos',
    icon: File,
    group: 'Finanzas',
  },
  {
    label: 'Finanzas y Presupuesto',
    href: '/dashboard/finanzas',
    icon: DollarSign,
    group: 'Finanzas',
  },
  {
    label: 'Documentos Finanzas',
    href: '/dashboard/finanzas/documentos',
    icon: File,
    group: 'Finanzas',
  },
  {
    label: 'Gestión Documental',
    href: '/dashboard/documentos-gestion',
    icon: FolderOpen,
    group: 'Finanzas',
  },
  {
    label: 'Reportes y Análisis',
    href: '/dashboard/reportes',
    icon: BarChart3,
    group: 'Finanzas',
  },
  {
    label: 'Módulo Legal',
    href: '/dashboard/legal',
    icon: Scale,
    group: 'Legal',
  },
  {
    label: 'Documentos Legal',
    href: '/dashboard/legal/documentos',
    icon: File,
    group: 'Legal',
  },
  
  // HSE
  {
    label: 'HSE',
    href: '/dashboard/hse',
    icon: Shield,
    group: 'HSE',
  },
  {
    label: 'Documentos HSE',
    href: '/dashboard/hse/documentos',
    icon: File,
    group: 'HSE',
  },
  
  // AYUDA
  {
    label: 'Guías de Uso',
    href: '/dashboard/guias',
    icon: HelpCircle,
    group: 'Ayuda',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Core': true,
    'Producción': true,
    'Operaciones': true,
    'Mantenimiento': false,
    'Bodega e Inventario': false,
    'Sostenibilidad': true,
    'Finanzas': false,
    'Legal': false,
  });
  const [isMounted, setIsMounted] = useState(false);

  // Force re-render after mount to ensure cookies are read
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter menu items based on user role
  const filteredMenuItems = useMemo(() => {
    if (!role) return [];
    
    // Superadmin ve todo
    if (role === 'superadmin' || role === 'admin') {
      return menuItems;
    }
    
    // Otros roles ven solo lo permitido
    return menuItems.filter(item => {
      const allowedRoles = rolePermissions[item.label] || [];
      return allowedRoles.includes(role);
    });
  }, [role]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-40',
          'lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <svg 
              viewBox="0 0 200 70" 
              className="w-32 h-auto"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Mountain outline */}
              <path
                d="M 40 45 L 50 30 L 60 38 L 75 20 L 95 35 L 120 15 L 140 30 L 160 25"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* LA PATAGUA text */}
              <text x="40" y="60" fontSize="16" fontWeight="bold" fill="currentColor" className="dark:text-orange-400 text-orange-600">
                LA
              </text>
              <text x="85" y="60" fontSize="16" fontWeight="bold" fill="currentColor" className="dark:text-orange-400 text-orange-600">
                PATAGUA
              </text>
            </svg>
          </Link>
        </div>

        {/* Navigation Menu - v7 Sistema Completo 5 Módulos */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {['Core', 'Producción', 'Operaciones', 'Mantenimiento', 'Bodega e Inventario', 'Sostenibilidad', 'Finanzas', 'Legal', 'Inteligencia Artificial', 'Administración', 'Ayuda'].map((group) => {
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
                      className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        isExpanded ? "rotate-0" : "-rotate-90"
                      )} 
                    />
                  </button>
                  <div className={cn(
                    "space-y-1 overflow-hidden transition-all duration-200",
                    isExpanded ? "max-h-[500px] opacity-100 mt-1" : "max-h-0 opacity-0"
                  )}>
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
            })}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-sidebar-border p-4 space-y-2">
          <ThemeToggle />
          <Button 
            variant="outline" 
            className="w-full justify-start gap-3 hover:bg-sidebar-accent/20 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>Configuración</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={logout}
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </Button>
          
          {/* Powered by n3uralia Footer */}
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

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

