'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Clock, Eye, Plus, Search } from 'lucide-react';

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
  if (value === 'aprobado') {
    return (
      <Badge className="gap-1 bg-[var(--brand-verde)]">
        <CheckCircle2 className="h-3 w-3" />
        Aprobado
      </Badge>
    );
  }

  if (value.includes('pendiente')) {
    return (
      <Badge className="gap-1 bg-[var(--secondary)]">
        <Clock className="h-3 w-3" />
        Pendiente
      </Badge>
    );
  }

  if (value === 'rechazado') {
    return <Badge className="bg-[var(--brand-rojo)]">Rechazado</Badge>;
  }

  return <Badge variant="outline">{estado || 'Sin estado'}</Badge>;
}

export default function ProcedimientosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, error, isLoading } = useSWR<CategoryApiResponse>('/api/dashboard/documentos-gestion/operacional', fetcher, {
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

  const filteredProcedures = useMemo(() => {
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
    return <div className="text-destructive">Error al cargar procedimientos</div>;
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Cargando procedimientos...</div>;
  }

  const stats = data?.stats || { total: 0, aprobados: 0, pendientes: 0, rechazados: 0 };
  const latestPending = (data?.documents.pendientes || []).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Procedimientos operacionales</h1>
        <p className="text-muted-foreground">Gestión real de procedimientos, protocolos y procesos operacionales.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/dashboard/documentos-gestion">
            Gestión documental
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/dashboard/documentos-gestion/contratos">
            Contratos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/dashboard/documentos-gestion/reportes">
            Reportes
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/dashboard/mantenimiento/documentos">
            Documentos de mantenimiento
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total de procedimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">Documentos reales en el catalogo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{stats.aprobados}</div>
            <p className="mt-1 text-xs text-muted-foreground">Procedimientos listos para uso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">En revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendientes}</div>
            <p className="mt-1 text-xs text-muted-foreground">Pendientes de actualizacion</p>
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

      {latestPending.length > 0 && (
        <Card className="border-[var(--secondary)]/30 bg-[var(--secondary)]/5">
          <CardHeader>
            <CardTitle className="text-base">Pendientes recientes</CardTitle>
            <CardDescription>Documentos que siguen en revisión dentro de procesos operacionales reales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestPending.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-[var(--secondary)]/20 bg-background/60 p-3">
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
          <CardTitle>Accesos rápidos</CardTitle>
          <CardDescription>Atajos utiles para revisar, medir y cruzar documentos.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/legal/documentos">
              Documentos legales
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/documentos">
              Documentos de mantenimiento
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/documentos-gestion/reportes">
              Reportes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Lista de procedimientos</CardTitle>
              <CardDescription>Protocolos operacionales y procesos documentados.</CardDescription>
            </div>

            <Button asChild className="gap-2 self-start">
              <Link href="/dashboard/sostenibilidad/documentos-flujo">
                <Plus className="h-4 w-4" />
                Nuevo procedimiento
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
              {filteredProcedures.map((proc) => (
                <div
                  key={proc.id}
                  className="flex flex-col gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex flex-1 items-start gap-4">
                    {String(proc.estado || '').toLowerCase() === 'aprobado' ? (
                      <CheckCircle2 className="mt-1 h-5 w-5 text-[var(--brand-verde)]" />
                    ) : (
                      <Clock className="mt-1 h-5 w-5 text-orange-600" />
                    )}

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{proc.documentId}</span>
                        <Badge variant="outline">{proc.version}</Badge>
                        {statusBadge(proc.estado)}
                      </div>
                      <p className="text-sm text-muted-foreground">{proc.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        Creado por {proc.createdBy || 'Sin dato'} - Validador 1: {proc.validador1?.nombre || 'Sin asignar'}
                      </p>
                    </div>
                  </div>

                  <div className="self-end lg:self-auto">
                    <Button asChild variant="ghost" size="sm" className="gap-2">
                      <Link href={`/dashboard/sostenibilidad/documentos-flujo?doc=${proc.documentId || proc.id}`}>
                        <Eye className="h-3 w-3" />
                        Abrir detalle
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}

              {filteredProcedures.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No hay procedimientos que coincidan con la búsqueda.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
