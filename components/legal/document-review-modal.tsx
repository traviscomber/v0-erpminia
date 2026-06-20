'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Download, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type ReviewLevel = 'L1' | 'L2';
type ReviewStatus = 'cumple' | 'no_cumple' | null;

export interface DocumentReviewModalProps {
  open: boolean;
  document: {
    id: string;
    title: string;
    description?: string;
    documentType?: string;
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

export function DocumentReviewModal({ open, document, level = 'L1', onClose, onReview }: DocumentReviewModalProps) {
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(null);
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReview = async (status: ReviewStatus) => {
    if (!document || status === null) return;
    if (status === 'no_cumple' && !observations.trim()) {
      alert('Debes agregar observaciones al rechazar un documento.');
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
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-lg">{document.title}</DialogTitle>
              <DialogDescription className="mt-1">Revisión - Nivel {level}</DialogDescription>
            </div>
            {hasBeenReviewed && (
              <Badge variant={currentStatusData.status === 'cumple' ? 'default' : 'destructive'}>
                {currentStatusData.status === 'cumple' ? 'Aprobado' : 'Rechazado'}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Documento</p>
              <p className="text-base font-semibold">{document.title}</p>
              {document.description && <p className="text-sm text-muted-foreground">{document.description}</p>}
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Tipo</p>
                <p className="font-medium">{document.documentType || 'Legal'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estado</p>
                <p className="font-medium capitalize">{document.status || 'pendiente'}</p>
              </div>
            </div>
            {document.fileUrl && (
              <div className="flex flex-col gap-2 pt-2 md:flex-row">
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver documento
                </a>
                <a
                  href={document.fileUrl}
                  download={document.title}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded bg-secondary px-3 py-2 text-sm text-secondary-foreground hover:bg-secondary/80"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </a>
              </div>
            )}
          </div>

          {hasBeenReviewed && currentStatusData.observations && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:bg-amber-950/20">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-4 w-4" />
                Revisión anterior (Nivel {level})
              </p>
              <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">{currentStatusData.observations}</p>
            </div>
          )}

          <div className="space-y-3 border-t pt-4">
            <label className="text-sm font-medium">Tu revisión</label>
            <div className="space-y-2">
              <Button
                variant={reviewStatus === 'cumple' ? 'default' : 'outline'}
                className="w-full justify-start gap-2"
                onClick={() => setReviewStatus('cumple')}
                disabled={loading}
              >
                <CheckCircle2 className="h-4 w-4" />
                Aprobar - Cumple
              </Button>
              <Button
                variant={reviewStatus === 'no_cumple' ? 'destructive' : 'outline'}
                className="w-full justify-start gap-2"
                onClick={() => setReviewStatus('no_cumple')}
                disabled={loading}
              >
                <XCircle className="h-4 w-4" />
                Rechazar - No cumple
              </Button>
            </div>
          </div>

          {reviewStatus === 'no_cumple' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Observaciones requeridas</label>
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
              <label className="text-sm font-medium">Observaciones opcionales</label>
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

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleReview(reviewStatus)}
            disabled={loading || reviewStatus === null}
            variant={reviewStatus === 'no_cumple' ? 'destructive' : 'default'}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {reviewStatus === null ? 'Selecciona una opción' : reviewStatus === 'cumple' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
