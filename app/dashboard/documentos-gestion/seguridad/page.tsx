'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, BadgeAlert, Download, Plus, Search, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type DocumentRow = {
  id: string;
  documentId: string;
  nombre: string;
  version: string;
  estado: string;
  createdBy: string;
  validador1?: { nombre?: string; rol?: string; accion?: string };
  validador2?: { nombre?: string; rol?: string; accion?: string };
  activo?: boolean;
};

type CategoryApiResponse = {
  categoria: string;
  stats: {
    total: number;
    aprobados: number;
    pendientes: number;
    rechazados: number;
  };
  documents: {
    aprobados: DocumentRow[];
    pendientes: DocumentRow[];
    rechazados: DocumentRow[];
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

function statusBadge(estado: string) {
  const value = String(estado || '').toLowerCase();
  if (value === 'aprobado') return <Badge className="bg-[var(--brand-verde)]">Aprobado</Badge>;
  if (value.includes('pendiente')) return <Badge className="bg-[var(--secondary)]">Pendiente</Badge>;
  if (value === 'rechazado') return <Badge className="bg-[var(--brand-rojo)]">Rechazado</Badge>;
  return <Badge variant="outline">{estado || 'Sin estado'}</Badge>;
}

export default function SeguridadPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, error, isLoading } = useSWR<CategoryApiResponse>('/api/dashboard/documentos-gestion/seguridad', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 300000,
  });

  const allDocuments = useMemo(
    () => [
      ...(data?.documents.aprobados || []),
      ...(data?.documents.pendientes || []),
      ...(data?.documents.rechazados || []),
    ],
    [data],
  );

  const filteredDocs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return allDocuments;

    return allDocuments.filter((doc) =>
      [doc.id, doc.documentId, doc.nombre, doc.version, doc.estado, doc.createdBy, doc.validador1?.nombre, doc.validador2?.nombre]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [allDocuments, searchTerm]);

  if (error) {
    return <div className="text-destructive">Error al cargar documentos de seguridad</div>;
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Cargando documentos de seguridad...</div>;
  }

  const stats = data?.stats || { total: 0, aprobados: 0, pendientes: 0, rechazados: 0 };
  const criticalDocs = (data?.documents.pendientes || []).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documentos de seguridad</h1>
        <p className="text-muted-foreground">Gestión real de MSDS, protocolos, incidentes y auditorías.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total de documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">Documentos reales en seguridad</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aprobados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{stats.aprobados}</div>
            <p className="mt-1 text-xs text-muted-foreground">Vigentes y listos para uso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">En revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendientes}</div>
            <p className="mt-1 text-xs text-muted-foreground">Pendientes de validacion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Rechazados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{stats.rechazados}</div>
            <p className="mt-1 text-xs text-muted-foreground">Requieren correccion</p>
          </CardContent>
        </Card>
      </div>

      {criticalDocs.length > 0 && (
        <Card className="border-[var(--brand-rojo)]/30 bg-[var(--brand-rojo)]/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeAlert className="h-5 w-5 text-[var(--brand-rojo)]" />
              Documentos pendientes
            </CardTitle>
            <CardDescription>Revisiones reales que necesitan atención ahora.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalDocs.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-[var(--brand-rojo)]/20 bg-background/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{doc.documentId}</span>
                  {statusBadge(doc.estado)}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{doc.nombre}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Creado por {doc.createdBy || 'Sin dato'} - {doc.validador1?.nombre || 'Sin validador asignado'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Documentos de seguridad</CardTitle>
              <CardDescription>MSDS, protocolos, incidentes y auditorías.</CardDescription>
            </div>
            <Button asChild className="gap-2">
              <Link href="/dashboard/sostenibilidad/documentos-flujo">
                <Plus className="h-4 w-4" />
                Nuevo documento
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, codigo o responsable..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon" aria-label="Buscar">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex flex-1 items-center gap-4">
                    {String(doc.estado || '').toLowerCase() === 'rechazado' ? (
                      <AlertTriangle className="h-5 w-5 text-[var(--brand-rojo)]" />
                    ) : (
                      <Shield className="h-5 w-5 text-[var(--secondary)]" />
                    )}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{doc.documentId}</span>
                        <Badge variant="outline">{doc.version}</Badge>
                        {statusBadge(doc.estado)}
                      </div>
                      <p className="text-sm text-muted-foreground">{doc.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        Creado por {doc.createdBy || 'Sin dato'} - Validador 1: {doc.validador1?.nombre || 'Sin asignar'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Button asChild variant="ghost" size="sm" className="gap-2">
                      <Link href={`/dashboard/sostenibilidad/documentos-flujo?doc=${doc.documentId || doc.id}`}>
                        <Download className="h-3 w-3" />
                        Ver detalle
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}

              {filteredDocs.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No hay documentos de seguridad que coincidan con la búsqueda.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
