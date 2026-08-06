'use client';

import { useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'motil-sidebar-collapsed';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === 'true');
    setReady(true);
  }, []);

  const toggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <div
        className={cn(
          'w-0 shrink-0 overflow-hidden transition-[width] duration-200 ease-out lg:block',
          ready && !collapsed ? 'lg:w-[292px]' : 'lg:w-0',
        )}
        aria-hidden={ready && collapsed ? true : undefined}
      >
        <Sidebar />
      </div>

      <div className="motil-dashboard-content flex min-w-0 flex-1 flex-col">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Mostrar navegación principal' : 'Ocultar navegación principal'}
          title={collapsed ? 'Mostrar navegación' : 'Ocultar navegación'}
          className="fixed top-4 z-50 hidden bg-background shadow-sm transition-[left] duration-200 lg:inline-flex"
          style={{ left: collapsed ? 16 : 308 }}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>

        <Header />
        <main className="flex-1 overflow-x-hidden px-4 py-5 md:px-6 md:py-6 xl:px-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>

      <style jsx global>{`
        @media (min-width: 1024px) {
          .motil-dashboard-content > header > div {
            padding-left: 4rem;
          }
        }
      `}</style>
    </div>
  );
}
