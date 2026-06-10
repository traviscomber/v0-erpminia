'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  fileType?: string;
  maxHeight?: string;
}

export function PDFViewer({ fileUrl, fileName, fileType, maxHeight = 'max-h-96' }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const handleDocumentLoadError = (error: Error) => {
    console.error('Error loading document:', error);
    setError('No se pudo cargar el documento. Tipo de archivo no soportado.');
    setIsLoading(false);
  };

  // For DOCX files, show a message that they need to be converted or downloaded
  if (fileType === 'docx' || fileType === 'doc' || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-muted rounded-lg border border-dashed p-4">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Los documentos Word (.docx) no se pueden previsualizar en el navegador.
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Descargar documento
            </a>
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 bg-muted rounded-lg border border-dashed p-4">
        <div className="text-center text-sm text-destructive">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isLoading && (
        <div className="flex items-center justify-center h-48 bg-muted rounded border">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Cargando documento...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          <div className={`overflow-auto bg-white rounded border ${maxHeight} flex items-start justify-center`}>
            <Document file={fileUrl} onLoadSuccess={handleDocumentLoadSuccess} onLoadError={handleDocumentLoadError}>
              <Page pageNumber={pageNumber} scale={1.0} />
            </Document>
          </div>

          {numPages > 1 && (
            <div className="flex items-center justify-between gap-2 px-2 py-1 bg-muted/50 rounded">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Página {pageNumber} de {numPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                disabled={pageNumber >= numPages}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Keep the old DocumentViewer component for backwards compatibility in other places
export interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: {
    id: string;
    title: string;
    documentNumber: string;
    documentType: string;
    category: string;
    status: string;
    fileUrl?: string;
    fileSize?: number;
    createdAt: string;
    createdByUser?: { name: string; email: string };
  };
}

export function DocumentViewer({ open, onOpenChange, document }: DocumentViewerProps) {
  const { Dialog, DialogContent, DialogHeader, DialogTitle } = require('@/components/ui/dialog');
  const { X } = require('lucide-react');

  if (!document) return null;

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
    const labels: { [key: string]: string } = {
      draft: 'Borrador',
      submitted: 'Enviado',
      under_review: 'En Revisión',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      expired: 'Vencido',
    };
    return labels[status] || status;
  };

  const { Badge } = require('@/components/ui/badge');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <DialogTitle className="text-2xl mb-2">{document.title}</DialogTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{document.documentNumber}</Badge>
              <Badge variant="outline">{document.documentType}</Badge>
              <Badge variant="outline">{document.category}</Badge>
              <Badge className={getStatusColor(document.status)}>
                {getStatusLabel(document.status)}
              </Badge>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Creado por</p>
              <p className="text-sm font-medium">
                {document.createdByUser?.name || 'Desconocido'}
              </p>
              <p className="text-xs text-muted-foreground">{document.createdByUser?.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Fecha de creación</p>
              <p className="text-sm font-medium">
                {new Date(document.createdAt).toLocaleDateString('es-CL')}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(document.createdAt).toLocaleTimeString('es-CL')}
              </p>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-muted/30 min-h-96">
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="text-6xl">📄</div>
              <div className="text-center">
                <p className="font-medium text-foreground">Archivo: {document.title}</p>
                <p className="text-sm text-muted-foreground">
                  {document.fileSize ? `${(document.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Tamaño desconocido'}
                </p>
              </div>

              {document.fileUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={document.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Archivo
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
