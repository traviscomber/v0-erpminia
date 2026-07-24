'use client';

import { useEffect, useState } from 'react';
import { getEquipmentImage } from '@/lib/maintenance/equipment-images';

type EquipmentPhotoProps = {
  assetName?: string | null;
  assetType?: string | null;
  machineFamily?: string | null;
};

/**
 * Renders a representative photo for the given equipment family/name.
 * Resolves client-side only to avoid SSR hydration mismatches.
 */
export function EquipmentPhoto({ assetName, assetType, machineFamily }: EquipmentPhotoProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const img =
      getEquipmentImage(machineFamily) ||
      getEquipmentImage(`${assetName || ''} ${assetType || ''}`);
    setSrc(img);
  }, [assetName, assetType, machineFamily]);

  if (!src) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <img
        src={src}
        alt={`Foto referencial de ${assetName || 'equipo'}`}
        className="h-44 w-full object-cover"
      />
    </div>
  );
}
