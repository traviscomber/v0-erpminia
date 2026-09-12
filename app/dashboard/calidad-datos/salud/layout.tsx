import type { ReactNode } from 'react';
import { ManagementContextNav } from '@/components/layout/management-context-nav';

export default function DataHealthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-5">
      <ManagementContextNav />
      {children}
    </div>
  );
}
