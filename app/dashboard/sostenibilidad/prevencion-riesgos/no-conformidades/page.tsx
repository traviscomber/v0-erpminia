'use client';

import { NoncConformancePage } from '@/components/sostenibilidad/nonconformance-page';

export default function NoConformidadesPage() {
  const orgId = 'default-org';

  return (
    <div className="min-h-screen bg-background p-8">
      <NoncConformancePage organizationId={orgId} />
    </div>
  );
}
