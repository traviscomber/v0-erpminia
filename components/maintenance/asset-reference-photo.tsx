'use client';

import useSWR from 'swr';
import { ExternalLink, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type AssetResponse = {
  asset?: {
    name?: string | null;
    manufacturer?: string | null;
    model?: string | null;
  };
};

type ReferencePhoto = {
  imageUrl: string;
  sourceUrl: string;
  title: string;
  attribution: string;
};

const fetcher = async (url: string): Promise<AssetResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('No fue posible cargar la referencia visual');
  return response.json();
};

function resolveReferencePhoto(manufacturer?: string | null, model?: string | null): ReferencePhoto | null {
  const identity = `${manufacturer || ''} ${model || ''}`.toLowerCase();

  if (identity.includes('weir') || identity.includes('warman')) {
    return {
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Warman%20centrifugal%20pump.jpg?width=1200',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Warman_centrifugal_pump.jpg',
      title: 'Bomba centrífuga Warman — referencia visual de familia',
      attribution: 'Bernard S. Janse · Wikimedia Commons · CC BY 2.5 / CC BY-SA 3.0',
    };
  }

  return null;
}

export function AssetReferencePhoto({ assetId }: { assetId: string }) {
  const { data } = useSWR<AssetResponse>(
    assetId ? `/api/maintenance/assets/${encodeURIComponent(assetId)}/technical-sheet` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const photo = resolveReferencePhoto(data?.asset?.manufacturer, data?.asset?.model);
  if (!photo) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4 text-primary" />
          Referencia visual
        </CardTitle>
        <CardDescription>
          Imagen de referencia del fabricante o familia. No corresponde necesariamente al activo instalado en faena.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border bg-muted/20">
          <img
            src={photo.imageUrl}
            alt={photo.title}
            loading="lazy"
            className="aspect-[16/9] w-full object-cover"
          />
        </a>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{photo.attribution}</span>
          <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            Ver fuente
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
