import type { ReactNode } from 'react';
import { OpenSupplyNeeds } from '@/components/procurement/open-supply-needs';

export default function ProcurementFlowLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <OpenSupplyNeeds />
      {children}
    </div>
  );
}
