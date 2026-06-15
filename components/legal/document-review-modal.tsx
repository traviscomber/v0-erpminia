'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type ReviewLevel = 'L1' | 'L2';
type ReviewStatus = 'cumple' | 'no_cumple' | null;

export interface DocumentReviewModalProps {
  open: boolean;
  document: {
    id: string;
    title: string;
    fileUrl: string | null;
    status: string;
    l1_status?: string;
    l1_observations?: string;
    l2_status?: string;
    l2_observations?: string;
  } | null;
  level?: ReviewLevel;
  onClose: () => void;
  onReview: (docId: string, reviewLevel: ReviewLevel, status: ReviewStatus, observations: string) => Promise<void>;
}

export function DocumentReviewModal({
  open,
  document,
  level = 'L1',
  onClose,
  onReview,
}: DocumentReviewModalProps) {
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(null);
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReview = async (status: ReviewStatus) => {
    if (!document || status === null) return;
    if (status === 'no_cumple' && !observations.trim()) {
      alert('Debes agregar observaciones al rechazar un documento');
      return;
    }

    setLoading(true);
    try {
      await onReview(document.id, level, status, observations);
      setReviewStatus(null);
      setObservations('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!document) return null;

  const currentStatusData =
    level === 'L1'
      ? { status: document.l1_status, observations: document.l1_observations }
      : { status: document.l2_status, observations: document.l2_observations };

  const hasBeenReviewed = currentStatusData.status !== null && currentStatusData.status !== undefined;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg">{document.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Revisión - Nivel {level}</p>
            </div>
            {hasBeenReviewed && (
              <Badge variant={currentStatusData.status === 'cumple' ? 'default' : 'destructive'}>
                {currentStatusData.status === 'cumple' ? 'Aprobado' : 'Rechazado'}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Document Preview */}
          {document.fileUrl ? (
            <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Vista previa del documento</p>
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Abrir en nueva pestaña ↗
                </a>
              </div>
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(document.fileUrl)}&embedded=true`}
                className="w-full h-96 rounded border"
                title={document.title}
              />
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
              <p className="text-sm">No hay vista previa disponible para este documento</p>
            </div>
          )}

          {/* Previous Review (if exists) */}
          {hasBeenReviewed && currentStatusData.observations && (
            <div className="border rounded-lg p-3 bg-amber-50 dark:bg-amber-950/20">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Revisión anterior (Nivel {level})
              </p>
              <p className="text-sm mt-2 text-amber-800 dark:text-amber-300">
                {currentStatusData.observations}
              </p>
            </div>
          )}

          {/* Review Form */}
          <div className="space-y-3 border-t pt-4">
            <label className="text-sm font-medium">Tu Revisión</label>
            <div className="space-y-2">
              <Button
                variant={reviewStatus === 'cumple' ? 'default' : 'outline'}
                className="w-full justify-start gap-2"
                onClick={() => setReviewStatus('cumple')}
                disabled={loading}
              >
                <CheckCircle2 className="w-4 h-4" />
                Aprobar - Cumple
              </Button>
              <Button
                variant={reviewStatus === 'no_cumple' ? 'destructive' : 'outline'}
                className="w-full justify-start gap-2"
                onClick={() => setReviewStatus('no_cumple')}
                disabled={loading}
              >
                <XCircle className="w-4 h-4" />
                Rechazar - No Cumple
              </Button>
            </div>
          </div>

          {/* Observations */}
          {reviewStatus === 'no_cumple' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Observaciones (requeridas)</label>
              <Textarea
                placeholder="Describe los motivos del rechazo y las acciones correctivas necesarias..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="min-h-24"
                disabled={loading}
              />
            </div>
          )}

          {reviewStatus === 'cumple' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Observaciones (opcional)</label>
              <Textarea
                placeholder="Agrega cualquier nota o comentario..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="min-h-20"
                disabled={loading}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleReview(reviewStatus)}
            disabled={loading || reviewStatus === null}
            variant={reviewStatus === 'no_cumple' ? 'destructive' : 'default'}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {reviewStatus === null
              ? 'Selecciona una opción'
              : reviewStatus === 'cumple'
                ? 'Confirmar Aprobación'
                : 'Confirmar Rechazo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
