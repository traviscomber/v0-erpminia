'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GeologiaDashboard } from '@/components/production/geologia-dashboard';
import { GeologiaHistoricalCanonical } from '@/components/production/geologia-historical-canonical';
import { GeologiaAiFloatingChat } from '@/components/production/geologia-ai-floating-chat';

const GEOLOGY_CHAT_ICON = 'data:image/webp;base64,UklGRtoBAABXRUJQVlA4IM4BAACwCwCdASpAAEAAPqFMoE0mJCMrogqpcBQJZQDJvF1Z5hYA3uE7hYiTdhw6xjVrHZs7R3GQGWvooB8o+sePZf/UuuqyHyCs8yGgEEydNdcoJw8hLr5xOb3RVyPjk68Cg4ywxnAtf2gAxQERaaemn/EMB5LRgQZWfj0yW6L+5UrT1nay7DeBUzq4Xcpd9vBIU2TkzB7LsU08i3DWdTxFsrHD2CfQMLQQ8/ed1owu8dnV2SmaPuwcVUUu+xRfamACWEEOvKFiHKzFqKyKFjB0qB8P+53oOA7LDnO8T0RY1GeFYl9Ok8eZp8T94fdk87w9ut/3GQk2vr57GUfwgeNNvK1EPVHKTu4MLBoFOm/dbVb5kN9TI+iR6+rP7MtxIvIW/4LUIfdfpfrG+TD1rAsDhFYccTkla3iOs4SHpGjGtlmNFFIOHSOO8tK/WeBZEB74g01Dz8KcE1BPeU/rMAhqt9nNpIIyP6FbW78698Y12pxSenZuRe6iMdMX1AJWRIcxzZs0qQuB5gO9pQ2PorC0I7hZLcy9rHwZvH0G+99dVeBZ9/b0UdFB5TvbEenAvcI1Ln9txudQTzVPuQDocjN/WWTV8PoIWxALM0AigdnWKAA=';

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
      <style>{`
        button[aria-label="Abrir Asistente Senior de Geología"] {
          background-image: url('${GEOLOGY_CHAT_ICON}');
          background-position: 10px center;
          background-repeat: no-repeat;
          background-size: 34px 34px;
          min-width: 132px;
          padding-left: 52px;
          padding-right: 16px;
        }
        button[aria-label="Abrir Asistente Senior de Geología"] > svg {
          display: none;
        }
        @media (max-width: 639px) {
          button[aria-label="Abrir Asistente Senior de Geología"] {
            width: 52px;
            min-width: 52px;
            padding: 0;
            background-position: center;
            background-size: 36px 36px;
          }
        }
      `}</style>

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
      <GeologiaAiFloatingChat />
    </div>
  );
}
