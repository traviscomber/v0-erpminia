'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
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
    <div className="flex min-h-screen bg-background">
      <div
        className={cn(
          'w-0 shrink-0 overflow-hidden border-r border-border/60 bg-sidebar transition-[width] duration-200 ease-out lg:block',
          ready && !collapsed ? 'lg:w-[248px]' : 'lg:w-0',
        )}
        aria-hidden={ready && collapsed ? true : undefined}
      >
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header sidebarCollapsed={collapsed} onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden bg-muted/20 px-4 py-5 md:px-6 md:py-6 xl:px-8 xl:py-7">
          <div className="motil-page">{children}</div>
        </main>
      </div>
    </div>
  );
}
