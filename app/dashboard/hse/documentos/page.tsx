'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Search, Download, AlertTriangle } from 'lucide-react';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('No se pudieron cargar los documentos HSE');
  }
  return response.json();
};

const tipoColores: Record<string, string> = {
  politica: 'bg-[var(--secondary)]/10 text-blue-800',
  programa: 'bg-[var(--brand-verde)]/10 text-[var(--brand-verde)]',
  reglamento: 'bg-[var(--secondary)]/10 text-[var(--secondary)]',
  procedimiento: 'bg-orange-100 text-orange-800',
  instructivo: 'bg-[var(--secondary)]/10 text-[var(--secondary)]',
  plan: 'bg-[var(--secondary)]/10 text-[var(--secondary)]',
};

const estadoColores: Record<string, string> = {
  vigente: 'bg-[var(--brand-verde)]/10 text-[var(--brand-verde)]',
  en_revision: 'bg-[var(--secondary)]/10 text-[var(--secondary)]',
  obsoleto: 'bg-[var(--brand-rojo)]/10 text-[var(--brand-rojo)]',
};

export default function HSEDocumentosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');

  const { data, error, isLoading } = useSWR('/api/documentos?tipo=hse_master', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 600000,
  });

  const documentos = (data?.data || []).map((d: any) => ({
    id: d.id,
    nombre: d.nombre_documento || d.nombre || 'Sin nombre',
    tipo: String(d.tipo || 'procedimiento').toLowerCase(),
    version: d.version_actual || d.version || '1.0',
    fecha_actualizacion: d.fecha_actualizacion || d.updated_at || d.created_at || new Date().toISOString(),
    estado: String(d.estado || 'vigente').toLowerCase().replace('en revision', 'en_revision').replace('en revisi\u00f3n', 'en_revision'),
    descripcion: d.descripcion || '',
  }));

  const documentosVencidos = documentos.filter((d: any) => {
    const actualizado = new Date(d.fecha_actualizacion);
    const hoy = new Date();
    const diasDesdeActualizacion = Math.floor((hoy.getTime() - actualizado.getTime()) / (1000 * 60 * 60 * 24));
    return diasDesdeActualizacion > 365;
  });

  const filtrados = useMemo(
    () =>
      documentos.filter((d: any) => {
        const matchSearch = d.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const matchTipo = tipoFiltro === 'todos' || d.tipo === tipoFiltro;
        return matchSearch && matchTipo;
      }),
    [documentos, searchTerm, tipoFiltro]
  );

  if (error) {
    return <div className="text-red-500">Error al cargar documentos HSE.</div>;
  }

  if (isLoading) {
    return <div className="text-gray-500">Cargando documentos HSE...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentos HSE</h1>
          <p className="text-muted-foreground">Repositorio centralizado con control de vigencia y consulta rapida.</p>
        </div>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Nuevo documento
        </Button>
      </div>

      {documentosVencidos.length > 0 && (
        <div className="flex gap-3 rounded-lg border border-[var(--brand-rojo)]/30 bg-[var(--brand-rojo)]/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--brand-rojo)]" />
          <div>
            <p className="font-semibold text-[var(--brand-rojo)]">{documentosVencidos.length} documento(s) requiere(n) actualizacion</p>
            <p className="text-sm text-[var(--brand-rojo)]">Ultima actualizacion hace mas de un ano</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">{documentos.filter((d: any) => d.estado === 'vigente').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">En revision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">{documentos.filter((d: any) => d.estado === 'en_revision').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Requieren actualizacion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{documentosVencidos.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={tipoFiltro === 'todos' ? 'default' : 'outline'} size="sm" onClick={() => setTipoFiltro('todos')}>
              Todos
            </Button>
            {['politica', 'programa', 'reglamento', 'procedimiento', 'instructivo', 'plan'].map((tipo) => (
              <Button key={tipo} variant={tipoFiltro === tipo ? 'default' : 'outline'} size="sm" onClick={() => setTipoFiltro(tipo)}>
                {tipo}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtrados.map((doc: any) => (
          <Card key={doc.id} className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 items-start gap-3">
                  <FileText className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{doc.nombre}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{doc.descripcion}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className={tipoColores[doc.tipo] || tipoColores.procedimiento}>{doc.tipo}</Badge>
                      <Badge className={estadoColores[doc.estado] || estadoColores.vigente}>{doc.estado}</Badge>
                      <Badge variant="outline">v{doc.version}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Actualizado: {new Date(doc.fecha_actualizacion).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtrados.length === 0 && (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">No hay documentos para el filtro actual.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
