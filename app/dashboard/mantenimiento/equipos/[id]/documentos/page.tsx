'use client';

import { useParams } from 'next/navigation';
import { EquipmentDocumentWorkspace } from '@/components/maintenance/equipment-document-workspace';

export default function EquipmentDocumentsPage() {
  const params = useParams<{ id: string }>();
  const assetId = decodeURIComponent(String(params.id || ''));

  return <EquipmentDocumentWorkspace assetId={assetId} />;
}

