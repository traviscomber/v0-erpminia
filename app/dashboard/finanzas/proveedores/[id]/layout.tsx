import type { ReactNode } from 'react';
import { EntityTimeline } from '@/components/shared/entity-timeline';

type SupplierLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function SupplierLayout({ children, params }: SupplierLayoutProps) {
  const { id } = await params;
  const supplierId = decodeURIComponent(id);

  return (
    <div className="space-y-6">
      {children}
      <EntityTimeline entity="supplier" id={supplierId} />
    </div>
  );
}
