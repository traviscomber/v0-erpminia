'use client';

import { redirect } from 'next/navigation';
import { useParams } from 'next/navigation';

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
  const assetId = decodeURIComponent(String(params.id || ''));
  redirect(`/dashboard/mantenimiento/${scope}/${encodeURIComponent(assetId)}/ficha`);
}