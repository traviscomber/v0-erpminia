'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { PDFViewer } from './document-viewer';

interface Document {
  id: string;
  document_name: string;
  document_type: string;
  status: string;
  valid_until?: string;
  uploaded_at: string;
  uploaded_by: string;
  l1_observations?: string;
  file_url?: string;
}

interface DocumentReviewModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (documentId: string, observations?: string) => Promise<void>;
  onReject?: (documentId: string, observations: string) => Promise<void>;
  reviewLevel: 'L1' | 'L2';
}

export function DocumentReviewModal({
  document,
  isOpen,
  onClose,
  onApprove,
  onReject,
  reviewLevel,
}: DocumentReviewModalProps) {
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  if (!document) return null;

  const handleApprove = async () => {
    setAction('approve');
    setIsSubmitting(true);
    try {
      await onApprove?.(document.id, observations);
      setObservations('');
      onClose();
    } finally {
      setIsSubmitting(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    if (!observations.trim()) {
      alert('Debes ingresar observaciones para rechazar');
      return;
    }
    setAction('reject');
    setIsSubmitting(true);
    try {
      await onReject?.(document.id, observations);
      setObservations('');
      onClose();
    } finally {
      setIsSubmitting(false);
      setAction(null);
    }
  };

  const handleClose = () => {
    setObservations('');
    setAction(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del documento */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold">{document.document_name}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <Badge variant="secondary" className="ml-2">
                  {document.document_type}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <Badge className="ml-2">{document.status}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Cargado por:</span>
                <p className="mt-1">{document.uploaded_by}</p>
              </div>
              {document.valid_until && (
                <div>
                  <span className="text-muted-foreground">Válido hasta:</span>
                  <p className="mt-1">{new Date(document.valid_until).toLocaleDateString('es-CL')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Vista previa */}
          {document.file_url && (
            <>
              {(() => {
                const preview = (
                  <PDFViewer
                    fileUrl={document.file_url}
                    fileName={document.document_name}
                    fileType={document.document_type}
                    maxHeight="max-h-[400px]"
                  />
                );
                // Solo mostrar la sección si hay contenido para previsualizar
                return preview ? (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Vista previa del documento</label>
                    {preview}
                  </div>
                ) : null;
              })()}
            </>
          )}

          {/* Observaciones previas (if exists) */}
          {document.l1_observations && reviewLevel === 'L2' && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-900">Observaciones L1 (Dennyse):</h4>
                  <p className="text-sm text-yellow-800 mt-1">{document.l1_observations}</p>
                </div>
              </div>
            </div>
          )}

          {/* Formulario de revisión */}
          <div className="space-y-3">
            <label className="text-sm font-semibold">
              Observaciones de Revisión {reviewLevel}
            </label>
            <Textarea
              placeholder={
                reviewLevel === 'L1'
                  ? 'Ingresa observaciones (opcional para aprobación)'
                  : 'Ingresa observaciones o retroalimentación'
              }
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {reviewLevel === 'L1'
                ? 'Si apruebas sin observaciones, el documento pasa directamente a L2'
                : 'Las observaciones serán notificadas al responsable'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>

            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting}
            >
              {action === 'reject' && isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rechazando...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Rechazar
                </>
              )}
            </Button>

            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
            >
              {action === 'approve' && isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aprobando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aprobar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}




