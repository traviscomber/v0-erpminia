'use client';

import { useState } from 'react';
import { FileText, Download, Eye, Trash2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Exportar interfaz para compatibilidad
export interface Document {
  id: string;
  document_name?: string;
  document_type?: string;
  file_size_bytes?: number;
  uploaded_by?: string;
  uploaded_at?: string;
  valid_until?: string;
  status?: 'draft' | 'pending_l1' | 'pending_l2' | 'active' | 'rejected' | 'pending' | 'approved' | string;
  l1_observations?: string;
  l2_observations?: string;
  is_expired?: boolean;
  file_url?: string;
  // Legacy fields para compatibilidad
  title?: string;
  documentNumber?: string;
  documentType?: string;
  category?: string;
  createdAt?: string;
  createdByUser?: { name: string };
  expiryDate?: string;
  daysUntilExpiry?: number;
}

interface DocumentListProps {
  documents: Document[];
  isLoading?: boolean;
  onDelete?: (documentId: string) => Promise<void>;
  onView?: (document: Document | string) => void;
}

const statusConfig: Record<string, any> = {
  draft: { label: 'Borrador', icon: Clock, color: 'bg-gray-100 text-gray-800' },
  pending_l1: { label: 'Revisión L1', icon: Clock, color: 'bg-blue-100 text-blue-800' },
  pending_l2: { label: 'Revisión L2', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  active: { label: 'Aprobado', icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rechazado', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
};

export function DocumentList({
  documents,
  isLoading = false,
  onDelete,
  onView,
}: DocumentListProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string>('');

  const filtered = documents.filter((doc) => {
    const searchTerm = doc.document_name || doc.title || '';
    const matchesSearch = searchTerm.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || doc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFileIcon = (type?: string) => {
    const icons: Record<string, string> = {
      pdf: '📄',
      docx: '📝',
      doc: '📝',
      xlsx: '📊',
      xls: '📊',
    };
    return icons[type || ''] || '📎';
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Cargando documentos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-3">
        <Input
          placeholder="Buscar documentos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-md border border-input text-sm bg-background"
        >
          <option value="">Todos los estados</option>
          {Object.entries(statusConfig).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* Documents List */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No hay documentos</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => {
            const status = statusConfig[doc.status || 'draft'];
            const StatusIcon = status.icon;
            const displayName = doc.document_name || doc.title || 'Sin nombre';
            const displayType = doc.document_type || doc.documentType || 'unknown';

            return (
              <Card key={doc.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* File Icon */}
                    <div className="text-2xl mt-1">{getFileIcon(displayType)}</div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{displayName}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {displayType.toUpperCase()}
                        </Badge>
                        <Badge className={cn('text-xs', status.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        {doc.is_expired && (
                          <Badge variant="destructive" className="text-xs">
                            Vencido
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        {doc.file_size_bytes && <p>Tamaño: {formatFileSize(doc.file_size_bytes)}</p>}
                        <p>Cargado: {formatDate(doc.uploaded_at || doc.createdAt)}</p>
                        {(doc.valid_until || doc.expiryDate) && (
                          <p className={cn(
                            doc.is_expired ? 'text-destructive' : 'text-foreground'
                          )}>
                            Válido hasta: {formatDate(doc.valid_until || doc.expiryDate)}
                          </p>
                        )}
                      </div>

                      {/* Observations */}
                      {(doc.l1_observations || doc.l2_observations) && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                          <p className="font-semibold text-yellow-900">Observaciones:</p>
                          <p className="text-yellow-800">
                            {doc.l1_observations || doc.l2_observations}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {onView && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onView(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {doc.file_url && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={doc.file_url} download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
