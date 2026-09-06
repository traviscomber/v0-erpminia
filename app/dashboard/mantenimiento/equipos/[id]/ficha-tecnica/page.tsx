import { AssetReferencePhoto } from '@/components/maintenance/asset-reference-photo';
import { AssetTechnicalReferenceCandidate } from '@/components/maintenance/asset-technical-reference-candidate';
import { AssetTechnicalSheetCleanView } from '@/components/maintenance/asset-technical-sheet-clean-view';

export default async function EquipmentTechnicalSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <AssetReferencePhoto assetId={id} />
      <AssetTechnicalReferenceCandidate />
      <AssetTechnicalSheetCleanView scope="equipos" />
    </div>
  );
}
