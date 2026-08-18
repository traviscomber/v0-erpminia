import { Asset360Overview } from '@/components/maintenance/asset-360-overview';
import { AssetRelatedOperations } from '@/components/maintenance/asset-related-operations';
import { CertifiedFinancialSummary } from '@/components/finance/certified-financial-summary';
import { EntityTimeline } from '@/components/shared/entity-timeline';

export const metadata = {
  title: 'Vehículo 360° | Mantenimiento',
  description: 'Ficha canónica del vehículo con estado, órdenes de trabajo, costos, componentes e historial completo.',
};

type VehicleFichaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VehicleFichaPage({ params }: VehicleFichaPageProps) {
  const { id } = await params;
  const assetId = decodeURIComponent(id);

  return (
    <div className="space-y-6">
      <Asset360Overview assetId={assetId} scope="vehiculos" />
      <AssetRelatedOperations assetId={assetId} />
      <CertifiedFinancialSummary entity="asset" id={assetId} />
      <EntityTimeline entity="asset" id={assetId} />
    </div>
  );
}
