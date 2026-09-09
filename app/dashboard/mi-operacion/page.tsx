'use client';

import useSWR from 'swr';
import { StatePanel } from '@/components/ui/state-panel';
import { PersonalPortalView, type PersonalPortalData } from '@/components/executive/personal-portal-view';
import { DrillingEconomicsStrip } from '@/components/executive/drilling-economics-strip';
import { MaintenanceReviewStrip } from '@/components/executive/maintenance-review-strip';

const fetcher = async (url: string): Promise<PersonalPortalData> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar Mi operación');
  return payload;
};

export default function MiOperacionPage() {
  const { data, error, isLoading } = useSWR<PersonalPortalData>('/api/mi-area', fetcher, { revalidateOnFocus: false });

  if (isLoading) {
    return <StatePanel tone="loading" title="Cargando Mi operación" description="Leyendo producción y prioridades desde la capa canónica del cargo." />;
  }
  if (error) return <StatePanel tone="error" title="Vista no disponible" description={error.message} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PersonalPortalView
        data={data}
        eyebrow="Mi operación"
        description={`Centro de control operacional para ${data.user.name || data.user.cargo || 'el cargo actual'}. Los KPI describen la operación y no una evaluación personal.`}
      />
      <MaintenanceReviewStrip />
      <DrillingEconomicsStrip />
    </div>
  );
}
