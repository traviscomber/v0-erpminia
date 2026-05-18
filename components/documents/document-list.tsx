'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Document {
  id: string;
  title: string;
  documentNumber: string;
  documentType: string;
  category: string;
  status: string;
  createdAt: string;
  createdByUser?: { name: string };
  expiryDate?: string;
  daysUntilExpiry?: number;
}

export interface DocumentListProps {
  documents: Document[];
  isLoading?: boolean;
  onView: (document: Document) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onSearch?: (query: string) => void;
  onStatusFilter?: (status: string) => void;
}

export function DocumentList({
  documents,
  isLoading,
  onView,
  onLoadMore,
  hasMore,
  onSearch,
  onStatusFilter,
}: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    onStatusFilter?.(status);
  };

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
        return 'bg-destructive/50 text-destructive-foreground';
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

  const getUrgencyColor = (daysUntilExpiry?: number) => {
    if (!daysUntilExpiry && daysUntilExpiry !== 0) return '';
    if (daysUntilExpiry <= 0) return 'text-destructive font-semibold';
    if (daysUntilExpiry <= 7) return 'text-orange-600 font-semibold';
    if (daysUntilExpiry <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-4 items-center flex-wrap">
        <Input
          placeholder="Buscar por título, número..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 min-w-64"
        />
        <select
          value={selectedStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-3 py-2 rounded-md border border-input bg-background text-foreground"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="submitted">Enviado</option>
          <option value="under_review">En Revisión</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
          <option value="expired">Vencido</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Creado por</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay documentos para mostrar
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.documentNumber}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.documentType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(doc.status)}>
                      {getStatusLabel(doc.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {doc.expiryDate ? (
                      <div>
                        <p className={getUrgencyColor(doc.daysUntilExpiry)}>
                          {doc.daysUntilExpiry !== undefined
                            ? doc.daysUntilExpiry <= 0
                              ? 'VENCIDO'
                              : `${doc.daysUntilExpiry}d`
                            : new Date(doc.expiryDate).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin vencimiento</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {doc.createdByUser?.name || 'Desconocido'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onView(doc)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cargando...
              </>
            ) : (
              'Cargar más'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
