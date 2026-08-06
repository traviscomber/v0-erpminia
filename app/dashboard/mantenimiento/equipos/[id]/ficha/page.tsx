import { AssetDetailView } from '@/components/maintenance/asset-detail-view';
import { AssetRelatedOperations } from '@/components/maintenance/asset-related-operations';
import { CertifiedFinancialSummary } from '@/components/finance/certified-financial-summary';
import { EntityTimeline } from '@/components/shared/entity-timeline';

export const metadata = {
  title: 'Ficha del equipo | Mantenimiento',
  description: 'Resumen operacional, órdenes, costos e historial asociados al equipo.',
};

type EquipmentFichaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EquipmentFichaPage({ params }: EquipmentFichaPageProps) {
  const { id } = await params;
  const assetId = decodeURIComponent(id);

  return (
    <div className="space-y-6">
      <AssetDetailView scope="equipos" />
      <AssetRelatedOperations assetId={assetId} />
      <CertifiedFinancialSummary entity="asset" id={assetId} />
      <EntityTimeline entity="asset" id={assetId} />
    </div>
  );
}
