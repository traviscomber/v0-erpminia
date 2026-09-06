'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GeologiaDashboard } from '@/components/production/geologia-dashboard';
import { GeologiaHistoricalCanonical } from '@/components/production/geologia-historical-canonical';
import { GeologiaCanonicalStatus } from '@/components/production/geologia-canonical-status';
import { GeologiaDataCompleteness } from '@/components/production/geologia-data-completeness';
import { GeologiaInterpretation } from '@/components/production/geologia-interpretation';
import { GeologiaInterpretationMatrix } from '@/components/production/geologia-interpretation-matrix';
import { GeologiaNextBestEvidence } from '@/components/production/geologia-next-best-evidence';
import { GeologiaEvidenceRecoverySources } from '@/components/production/geologia-evidence-recovery-sources';
import { GeologiaEvidenceRecoveryWorklist } from '@/components/production/geologia-evidence-recovery-worklist';
import { GeologiaCoreVision } from '@/components/production/geologia-corevision';
import { GeologiaAiFloatingChat } from '@/components/production/geologia-ai-floating-chat';

const tabs = [
  ['today', 'Hoy'],
  ['interpretation', 'Interpretación'],
  ['matrix', 'Matriz'],
  ['priorities', 'Prioridades'],
  ['corevision', 'CoreVision'],
  ['holes', 'Sondajes'],
  ['results', 'Resultados'],
  ['pending', 'Tareas'],
  ['completeness', 'Cobertura'],
  ['canonical', 'Evidencia'],
  ['history', 'Histórico'],
] as const;

type TabKey = (typeof tabs)[number][0];

const tabKeys = new Set<TabKey>(tabs.map(([key]) => key));

const dashboardLabels: Record<Exclude<TabKey, 'history' | 'canonical' | 'completeness' | 'interpretation' | 'matrix' | 'priorities' | 'corevision'>, string> = {
  today: 'Hoy',
  holes: 'Mapa y sondajes',
  results: 'Resultados',
  pending: 'Pendientes',
};

export function GeologiaWorkspaceShell() {
  const [tab, setTab] = useState<TabKey>('today');
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab') as TabKey | null;
    if (requested && tabKeys.has(requested)) setTab(requested);
  }, []);

  useEffect(() => {
    if (tab === 'history' || tab === 'canonical' || tab === 'completeness' || tab === 'interpretation' || tab === 'matrix' || tab === 'priorities' || tab === 'corevision') return;
    const root = dashboardRef.current;
    if (!root) return;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('nav[aria-label="Vistas de Geología"] button'));
    const target = buttons.find((button) => button.textContent?.trim() === dashboardLabels[tab]);
    target?.click();
  }, [tab]);

  const selectTab = (key: TabKey) => {
    setTab(key);
    const url = new URL(window.location.href);
    if (key === 'today') url.searchParams.delete('tab');
    else url.searchParams.set('tab', key);
    if (key !== 'priorities') {
      url.searchParams.delete('recovery');
      url.searchParams.delete('hole');
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const showDashboard = !['history','canonical','completeness','interpretation','matrix','priorities','corevision'].includes(tab);

  return (
    <div className="space-y-5">
      <nav
        className="sticky top-0 z-30 -mx-1 flex flex-wrap gap-2 border-b bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        aria-label="Vistas principales de Geología"
      >
        {tabs.map(([key, label]) => (
          <Button key={key} size="sm" variant={tab === key ? 'default' : 'ghost'} onClick={() => selectTab(key)}>
            {label}
          </Button>
        ))}
      </nav>

      <div ref={dashboardRef} className={showDashboard ? 'block' : 'hidden'}>
        <style>{`nav[aria-label="Vistas de Geología"] { display: none !important; }`}</style>
        <GeologiaDashboard />
      </div>

      {tab === 'interpretation' ? <GeologiaInterpretation /> : null}
      {tab === 'matrix' ? <GeologiaInterpretationMatrix /> : null}
      {tab === 'priorities' ? <div className="space-y-8"><GeologiaNextBestEvidence /><GeologiaEvidenceRecoverySources /><GeologiaEvidenceRecoveryWorklist /></div> : null}
      {tab === 'corevision' ? <GeologiaCoreVision /> : null}
      {tab === 'completeness' ? <GeologiaDataCompleteness /> : null}
      {tab === 'canonical' ? <GeologiaCanonicalStatus /> : null}
      {tab === 'history' ? <GeologiaHistoricalCanonical /> : null}
      <GeologiaAiFloatingChat />
    </div>
  );
}
