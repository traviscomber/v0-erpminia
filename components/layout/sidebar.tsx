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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const menuItems = [
  {
    label: 'Dashboard',
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
  // Mining Operations
  {
    label: 'Operaciones',
    href: '/dashboard/operaciones',
    icon: HardHat,
    group: 'Minería',
  },
  {
    label: 'Producción',
    href: '/dashboard/produccion',
    icon: Zap,
    group: 'Minería',
  },
  {
    label: 'Órdenes de Trabajo',
    href: '/dashboard/work-orders',
    icon: Plus,
    group: 'Minería',
  },
  {
    label: 'Mantención',
    href: '/dashboard/mantenimiento',
    icon: Wrench,
    group: 'Minería',
  },
  {
    label: 'Gestión de Vehículos',
    href: '/dashboard/mantenimiento/vehiculos',
    icon: Cpu,
    group: 'Minería',
  },
  // Supply Chain
  {
    label: 'Inventario',
    href: '/dashboard/bodega',
    icon: Boxes,
    group: 'Logística',
  },
  // Safety & Compliance
  {
    label: 'HSE & Compliance',
    href: '/dashboard/hse',
    icon: Shield,
    group: 'Seguridad',
  },
  // Document Management
  {
    label: 'Gestión Documental',
    href: '/dashboard/documentos-gestion',
    icon: FolderOpen,
    group: 'Documentos',
  },
  {
    label: 'Contratos & Subcontratos',
    href: '/dashboard/documentos-gestion/contratos',
    icon: FileText,
    group: 'Documentos',
  },
  {
    label: 'Adquisiciones',
    href: '/dashboard/documentos-gestion/adquisiciones',
    icon: FileText,
    group: 'Documentos',
  },
  {
    label: 'Procedimientos',
    href: '/dashboard/documentos-gestion/procedimientos',
    icon: FileText,
    group: 'Documentos',
  },
  {
    label: 'Documentos Seguridad',
    href: '/dashboard/documentos-gestion/seguridad',
    icon: FileText,
    group: 'Documentos',
  },
  {
    label: 'Reportes & Análisis',
    href: '/dashboard/documentos-gestion/reportes',
    icon: FileText,
    group: 'Documentos',
  },
  // Administrative
  {
    label: 'Reportes',
    href: '/dashboard/reportes',
    icon: BarChart3,
    group: 'Administración',
  },
  {
    label: 'Finanzas',
    href: '/dashboard/finanzas',
    icon: DollarSign,
    group: 'Administración',
  },
  // Educational & Help
  {
    label: 'Integración Completa',
    href: '/dashboard/integracion-completa',
    icon: Network,
    group: 'Ayuda',
  },
  {
    label: 'Arquitectura Integración',
    href: '/dashboard/integracion-arquitectura',
    icon: Network,
    group: 'Ayuda',
  },
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
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Core': true, // Core siempre expandido por defecto
  });

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const handleLogout = () => {
    router.push('/auth/login');
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

        {/* Navigation Menu - v6 Collapsible Groups */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {['Core', 'Minería', 'Logística', 'Documentos', 'Seguridad', 'Administración', 'Ayuda'].map((group) => {
              const groupItems = menuItems.filter((item) => item.group === group);
              if (groupItems.length === 0) return null;
              const isExpanded = expandedGroups[group] ?? false;

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
                    {groupItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;

                      return (
                        <Link key={item.href} href={item.href}>
                          <Button
                            variant={isActive ? 'default' : 'ghost'}
                            className="w-full justify-start gap-3 relative"
                            onClick={() => setIsOpen(false)}
                          >
                            <Icon className="w-5 h-5" />
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-destructive text-white text-xs flex items-center justify-center font-semibold">
                                {item.badge}
                              </span>
                            )}
                          </Button>
                        </Link>
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
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Settings className="w-5 h-5" />
            <span>Configuración</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive"
            onClick={handleLogout}
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
