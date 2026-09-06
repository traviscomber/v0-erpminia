'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ReferenceCandidateResponse = {
  referenceAuthority?: 'canonical_identity_match' | 'reference_candidate_pending_validation' | 'none';
  referenceCandidate?: {
    brand?: string | null;
    model?: string | null;
    family?: string | null;
    sourceUrl?: string | null;
    sourceLabel?: string | null;
  } | null;
};

const fetcher = async (url: string): Promise<ReferenceCandidateResponse> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la referencia técnica');
  return payload;
};

export function AssetTechnicalReferenceCandidate() {
  const params = useParams<{ id: string }>();
  const assetId = decodeURIComponent(String(params.id || ''));
  const { data } = useSWR<ReferenceCandidateResponse>(
    assetId ? `/api/maintenance/assets/${encodeURIComponent(assetId)}/technical-sheet` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const candidate = data?.referenceCandidate;
  if (data?.referenceAuthority !== 'reference_candidate_pending_validation' || !candidate) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 shadow-none">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-4 w-4" />
            Referencia técnica sugerida
          </CardTitle>
          <CardDescription className="mt-1 max-w-3xl">
            Coincidencia propuesta desde texto o familia del activo. Está pendiente de validación responsable y no forma parte de la identidad canónica.
          </CardDescription>
        </div>
        <Badge variant="outline">Pendiente de validación</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <span><span className="text-muted-foreground">Marca candidata:</span> {candidate.brand || '—'}</span>
          <span><span className="text-muted-foreground">Modelo candidato:</span> {candidate.model || '—'}</span>
          <span><span className="text-muted-foreground">Familia candidata:</span> {candidate.family || '—'}</span>
        </div>
        <p className="text-muted-foreground">
          La fuente puede ser oficial para ese modelo, pero la coincidencia con este activo todavía no está validada. No materializa especificaciones, estado operacional ni alertas preventivas, y no autoriza crear una OT como si fueran datos observados.
        </p>
        {candidate.sourceUrl ? (
          <a href={candidate.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
            Revisar fuente candidata <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
