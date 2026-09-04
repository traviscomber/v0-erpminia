'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GeologiaDashboard } from '@/components/production/geologia-dashboard';
import { GeologiaHistoricalCanonical } from '@/components/production/geologia-historical-canonical';

const tabs = [
  ['today', 'Hoy'],
  ['holes', 'Mapa y sondajes'],
  ['results', 'Resultados'],
  ['pending', 'Pendientes'],
  ['history', 'Histórico'],
] as const;

type TabKey = (typeof tabs)[number][0];

const dashboardLabels: Record<Exclude<TabKey, 'history'>, string> = {
  today: 'Hoy',
  holes: 'Mapa y sondajes',
  results: 'Resultados',
  pending: 'Pendientes',
};

export function GeologiaWorkspaceShell() {
  const [tab, setTab] = useState<TabKey>('today');
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === 'history') return;
    const root = dashboardRef.current;
    if (!root) return;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('nav[aria-label="Vistas de Geología"] button'));
    const target = buttons.find((button) => button.textContent?.trim() === dashboardLabels[tab]);
    target?.click();
  }, [tab]);

  return (
    <div className="space-y-5">
      <nav
        className="sticky top-0 z-30 -mx-1 flex flex-wrap gap-2 border-b bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        aria-label="Vistas principales de Geología"
      >
        {tabs.map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={tab === key ? 'default' : 'ghost'}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </nav>

      <div ref={dashboardRef} className={tab === 'history' ? 'hidden' : 'block'}>
        <style>{`nav[aria-label="Vistas de Geología"] { display: none !important; }`}</style>
        <GeologiaDashboard />
      </div>

      {tab === 'history' ? <GeologiaHistoricalCanonical /> : null}
    </div>
  );
}
