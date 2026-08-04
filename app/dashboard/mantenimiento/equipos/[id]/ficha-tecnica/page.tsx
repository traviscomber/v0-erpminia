import { AssetReferencePhoto } from '@/components/maintenance/asset-reference-photo';
import { AssetTechnicalSheetView } from '@/components/maintenance/asset-technical-sheet-view';

export default async function EquipmentTechnicalSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <AssetReferencePhoto assetId={id} />
      <AssetTechnicalSheetView scope="equipos" />
    </div>
  );
}
