'use client';

import { useEffect, useState } from 'react';
import { Loader2, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  maxHeight: string;
}

export function PDFViewer({ fileUrl, fileName, fileType, maxHeight = 'max-h-96' }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canPreview, setCanPreview] = useState(true);

  const getFileType = () => {
    if (fileType) return fileType.toLowerCase();
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ext || '';
  };

  const actualFileType = getFileType();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(actualFileType);
  const isPdf = actualFileType === 'pdf';

  useEffect(() => {
    setIsLoading(false);
    setError(null);
  }, [fileUrl]);

  if (error || !canPreview) return null;

  if (isImage) {
    return (
      <div className={`flex items-center justify-center overflow-hidden rounded-lg border bg-muted ${maxHeight}`}>
        <img
          src={fileUrl}
          alt={fileName}
          className="h-full w-full object-contain"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setCanPreview(false);
          }}
        />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className={`space-y-2 ${maxHeight}`}>
        {isLoading && (
          <div className="flex h-48 items-center justify-center rounded border bg-muted">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Cargando PDF...</p>
            </div>
          </div>
        )}
        <object
          data={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
          type="application/pdf"
          className={`w-full rounded border border-muted bg-white ${maxHeight}`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setCanPreview(false);
          }}
        >
          <div />
        </object>
      </div>
    );
  }

  return null;
}

export interface DocumentViewerDocument {
  id: string;
  title: string;
  documentNumber: string;
  documentType: string;
  category: string;
  status: string;
  fileUrl?: string;
  file_url?: string;
  fileSize?: number;
  file_size_bytes?: number;
  createdAt: string;
  createdByUser: { name: string; email?: string };
}

export interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentViewerDocument;
}

export function DocumentViewer({ open, onOpenChange, document }: DocumentViewerProps) {
  const { Dialog, DialogContent, DialogHeader, DialogTitle } = require('@/components/ui/dialog');
  const { Badge } = require('@/components/ui/badge');
  const { X } = require('lucide-react');

  if (!document) return null;
  const fileUrl = document.fileUrl || document.file_url || '';
  const fileSize = document.fileSize ?? document.file_size_bytes ?? 0;
  const createdByEmail = document.createdByUser.email || '';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-secondary text-secondary-foreground';
      case 'rejected':
        return 'bg-destructive text-destructive-foreground';
      case 'pending':
      case 'submitted':
      case 'under_review':
        return 'bg-primary text-primary-foreground';
      case 'expired':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Borrador',
      submitted: 'Enviado',
      under_review: 'En revision',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      expired: 'Vencido',
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <DialogTitle className="mb-2 text-2xl">{document.title}</DialogTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{document.documentNumber}</Badge>
              <Badge variant="outline">{document.documentType}</Badge>
              <Badge variant="outline">{document.category}</Badge>
              <Badge className={getStatusColor(document.status)}>{getStatusLabel(document.status)}</Badge>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="rounded p-1 transition-colors hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Creado por</p>
              <p className="text-sm font-medium">{document.createdByUser.name || 'Desconocido'}</p>
              {createdByEmail ? <p className="text-xs text-muted-foreground">{createdByEmail}</p> : null}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Fecha de creacion</p>
              <p className="text-sm font-medium">{new Date(document.createdAt).toLocaleDateString('es-CL')}</p>
              <p className="text-xs text-muted-foreground">{new Date(document.createdAt).toLocaleTimeString('es-CL')}</p>
            </div>
          </div>

          <div className="min-h-96 rounded-lg border bg-muted/30 p-4">
            <div className="flex h-full flex-col items-center justify-center space-y-4">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium text-foreground">Archivo: {document.title}</p>
                <p className="text-sm text-muted-foreground">
                  {fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)} MB` : 'Tamano desconocido'}
                </p>
              </div>

              {fileUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Descargar archivo
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { PDFViewer as PDFVerer };
export { DocumentViewer as DocumentVerer };