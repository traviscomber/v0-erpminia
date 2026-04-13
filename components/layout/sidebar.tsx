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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    label: 'Work Orders',
    href: '/dashboard/work-orders',
    icon: Plus,
    group: 'Minería',
  },
  {
    label: 'Mantenimiento',
    href: '/dashboard/mantenimiento',
    icon: Wrench,
    group: 'Minería',
  },
  // Supply Chain
  {
    label: 'Procurement',
    href: '/dashboard/procurement',
    icon: ShoppingCart,
    group: 'Logística',
  },
  {
    label: 'Inventario',
    href: '/dashboard/bodega',
    icon: Boxes,
    group: 'Logística',
  },
  // Safety & Compliance
  {
    label: 'HSE / Compliance',
    href: '/dashboard/hse',
    icon: AlertTriangle,
    group: 'Seguridad',
  },
  {
    label: 'Documentos',
    href: '/dashboard/documentos-v2',
    icon: FileText,
    group: 'Seguridad',
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
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

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
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground">n3uralia</span>
              <span className="text-xs text-sidebar-accent-foreground">mining</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-6">
            {['Core', 'Minería', 'Logística', 'Seguridad', 'Administración'].map((group) => {
              const groupItems = menuItems.filter((item) => item.group === group);
              if (groupItems.length === 0) return null;

              return (
                <div key={group}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                    {group}
                  </p>
                  <div className="space-y-1">
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
