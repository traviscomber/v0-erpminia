import type { ReactNode } from 'react';
import { CertifiedFinancialSummary } from '@/components/finance/certified-financial-summary';

type ProductLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ProductLayout({ children, params }: ProductLayoutProps) {
  const { id } = await params;
  const productId = decodeURIComponent(id);

  return (
    <div className="space-y-6">
      {children}
      <CertifiedFinancialSummary entity="product" id={productId} />
    </div>
  );
}
