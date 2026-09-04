'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GeologiaDashboard } from '@/components/production/geologia-dashboard';
import { GeologiaHistoricalCanonical } from '@/components/production/geologia-historical-canonical';
import { GeologiaAiFloatingChat } from '@/components/production/geologia-ai-floating-chat';

const GEOLOGY_CHAT_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABACAYAAADlNHIOAAALAUlEQVR42u2aeXAb1R3Hf+/Y1bGybMm3FVv4SIwdAnHdGsIRE2gyQKAcITSUpoW2UJhCOy1MGShTT+g/LVAoU0hgCj2YAi0hnKUcoQFDSCDEuU8jJ7ItO3ase1d773v9IwZSSksLzEhD9jOj0Ura2dHv+/2993vvtwvg4uLi4uLi4uLi4uLi4uLi4vJ5wDkgzjlylSiK+H34/eO+PsCuIv876DO+4LW+PgoA8PKNC6W3Hrm25ogJvdSV9pOF/+yZ/9oR8ZPJVzvN0d9vef3uS0ZuX9LRVYojgZaQ8BwAeHd3t5DJZEKShEUAHwAAYIy5D+D9j+Cf/s7v//ACHosy0YfoOzHIowUr8q/+4cZlAbBWCR6nojxcBo0hT/+zP51/5cW3v/lUXx/HK1YAcw04SvzOzk7Rtu0eRcmGKaWK44ApIMaRAJwCA5sKIKAjf5hSCoRQhIEjgjHDyOaUAEgitf7xy+PEMrPuzq0T49d4QAZAxGrsaIU3127xvz1waM3pnZEegMQAAGCA4ptAS0T8gG7pCwmQcVU11iYSCe2ThsrH0d5eWfbDVNlba/fk5ozsGrbayx0cuewK0r+hnz+49gCRbQQjaYW9sRvYdOxFN4AU3YClQIKJ4Lmc8j1Dg0M78vm8/XGFtbe3lw4PD38g2JqVt5xw+fkndy4+rZOed2I1PP/2kJZKaV49Z92zbuskzK71O/WkQHa8tZU/8PhGUrDYM2f2dtz/8l2XCAGGrNd2jSU5AFrxRSh6nxIMAKylvWUOWFB94MCBddMJ4Xz0xKVLl5LVq1c76c1PlL80sOsixNi3NbVwBnZsKoJllgl2VkLaSD4jr1r159drFaBXnhGVZs0/vkL/y+Yp73tJ45U59Z4Hb/5Gz737ZBq+69F37zx+TvTelY+tz04LwI/VEQBV4dCXGePbs9mserQQfX19GABIT08PXb16tX3OwvkXbxtK/M3nEb+FEG7GCCPdtB3DsChiLCBS0tDRUn3hDT+5IF3T3HTbi2u3lY1krBOHUpYl+T2/nhuRfpUYTUZ+9sjAVlpe+XNTKXQtH0u/N50I/FgcAdDd3S3kcrlzAOCVWCxm/KfzOjo6LgyU+Z/0eURqmqZZFfTgE9ubcDRSCU31YQgHKIR9wLLpKTgYP0Rf37j/xZV/33Xe7NrAdw/LxkBnQ/mC2nJy674JfVgH8mjsUOaeM7talzqByNP9/f32MVuEk8kkEUWRNTQ0OLFY7IOkIBjzH1z99ZlTmcLpAGheYnxyeSYnE1lWbFXVaKSqFeXzBdidl2E0Ps4bqstgx7443r51b85P+LunntS0bsM9l94yo9rbbpnqyf3bE+F121NPzpWC2f2T6kmNjaQOEOiCMioBQO4TavsXfhnKAfrhqGKLp6YmH92xb+SCUEXQRwiGqlCQhYJ+VlA17DgMsrIGpmVBuMzHbduG/nd2gsCZc/GirsTMxlB10C/0lYd9gUNyAWLxHKRyCCSPFzYfzEIirULIT26xbWxrOi16/CVggAP9/cC7u1uC5w8ckFf099u1dfXHZ+WCjxICBOMtDXWVX4pGamBmS8SSfD7COYeCqoKm6iBgDmf19qDmGonUBckcRc7DtlgSJtKKkckWmCQS4d1Ykg5OyGDazqSPoIf2jSSToYoKQjDlxY6+qDUgGo16PR6yoL6+ce3U1GhDoeDkvV463zRZlWoYKkGoyyd53zMN5yJRoIsi9dVCTVUFhMsDViDgJ7XVIZC8AhBgiNkGlzMZbuTTPJXKscmUIiTSKopNZM2C6SQqPOQtETkbC7K5pjIazfqwvtCHpA3rd+7MFHMKKuoqqLq6miDEK8A/1XsBTIOIuFQAAAAASUVORK5CYII=';

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
          background-image: linear-gradient(rgba(12, 14, 16, 0.18), rgba(12, 14, 16, 0.18)), url('${GEOLOGY_CHAT_ICON}');
          background-position: center;
          background-repeat: no-repeat;
          background-size: 46px 31px;
          min-width: 52px;
          padding-left: 54px;
        }
        button[aria-label="Abrir Asistente Senior de Geología"] > svg {
          display: none;
        }
        @media (max-width: 639px) {
          button[aria-label="Abrir Asistente Senior de Geología"] {
            width: 52px;
            padding: 0;
            background-size: 46px 31px;
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
