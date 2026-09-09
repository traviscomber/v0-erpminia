'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

type AssetDetailViewProps = {
  scope?: 'vehiculos' | 'equipos';
};

/**
 * Compatibility entrypoint kept for routes that still import the legacy detail view.
 * The canonical maintenance surface is the operational 360 ficha, where runtime
 * meter readings, audited reliability, costs, work orders and evidence are kept
 * semantically separate.
 */
export function AssetDetailView({ scope = 'vehiculos' }: AssetDetailViewProps) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assetId = decodeURIComponent(String(params.id || ''));

  useEffect(() => {
    if (!assetId) return;
    router.replace(`/dashboard/mantenimiento/${scope}/${encodeURIComponent(assetId)}/ficha`);
  }, [assetId, router, scope]);

  return null;
}