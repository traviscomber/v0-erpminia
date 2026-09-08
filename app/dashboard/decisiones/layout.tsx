'use client';

import { usePathname } from 'next/navigation';
import { DecisionCasesPanel } from '@/components/dashboard/decision-cases-panel';

export default function DecisionCenterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDecisionHome = pathname === '/dashboard/decisiones' || pathname === '/dashboard/decisiones/';

  return (
    <>
      {children}
      {isDecisionHome ? <DecisionCasesPanel /> : null}
    </>
  );
}
