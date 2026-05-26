'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Search, Upload, Download, AlertTriangle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const tipoColores: Record<string, string> = {
  'política': 'bg-[var(--secondary)]/10 text-blue-800',
  programa: 'bg-[var(--brand-verde)]/10 text-[var(--brand-verde)]',
  reglamento: 'bg-[var(--secondary)]/10 text-[var(--secondary)]',
  procedimiento: 'bg-orange-100 text-orange-800',
  instructivo: 'bg-[var(--secondary)]/10 text-[var(--secondary)]',
  plan: 'bg-[var(--secondary)]/10 text-[var(--secondary)]',
};

const estadoColores = {
  vigente: 'bg-[var(--brand-verde)]/10 text-[var(--brand-verde)]',
  en_revision: 'bg-[var(--secondary)]/10 text-[var(--secondary)]',
  obsoleto: 'bg-[var(--brand-rojo)]/10 text-[var(--brand-rojo)]',
};

export default function HSEDocumentosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');

  const { data: docData } = useSWR(
    `/api/documentos?tipo=hse_master`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 600000 }
  );

  // Map API response to expected format
  const rawData = docData?.data || [];
  console.log('[v0] Raw API data:', rawData);
  
  const documentos = rawData.map((d: any) => ({
    id: d.id,
    nombre: d.nombre_documento || d.nombre || 'Sin nombre',
    tipo: d.tipo,
    version: d.version_actual || d.version || '1.0',
    fecha_actualizacion: d.fecha_actualizacion,
    estado: d.estado === 'en revisión' ? 'en_revision' : d.estado,
    descripcion: d.descripcion || '',
    areas: d.areas_aplica || [],
    cargos: d.cargos_aplica || [],
  }));
  
  console.log('[v0] Mapped documentos:', documentos);

  const documentosVencidos = documentos.filter((d: any) => {
    if (!d.fecha_actualizacion) return false;
    const actualizado = new Date(d.fecha_actualizacion);
    const hoy = new Date();
    const diasDesdeActualizacion = Math.floor((hoy.getTime() - actualizado.getTime()) / (1000 * 60 * 60 * 24));
    return diasDesdeActualizacion > 365;
  });

  const filtrados = documentos.filter((d: any) => {
    const matchSearch = d.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = tipoFiltro === 'todos' || d.tipo === tipoFiltro;
    return matchSearch && matchTipo;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Documentos HSE</h1>
          <p className="text-muted-foreground">Repositorio centralizado con control de vigencia</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Documento
        </Button>
      </div>

      {/* Alerts */}
      {documentosVencidos.length > 0 && (
        <div className="bg-[var(--brand-rojo)]/5 border border-[var(--brand-rojo)]/30 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-[var(--brand-rojo)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[var(--brand-rojo)]">{documentosVencidos.length} documento(s) requiere(n) actualización</p>
            <p className="text-sm text-[var(--brand-rojo)]">Última actualización fue más de 1 año atrás</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Documentos</CardTitle>
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
            <div className="text-2xl font-bold text-[var(--brand-verde)]">
              {documentos.filter((d: any) => d.estado === 'vigente').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">En Revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--secondary)]">
              {documentos.filter((d: any) => d.estado === 'en_revision').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Requiere Actualización</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">{documentosVencidos.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={tipoFiltro === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTipoFiltro('todos')}
            >
              Todos
            </Button>
            {['política', 'programa', 'reglamento', 'procedimiento', 'instructivo', 'plan'].map((tipo) => (
              <Button
                key={tipo}
                variant={tipoFiltro === tipo ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTipoFiltro(tipo)}
              >
                {tipo}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="space-y-2">
        {filtrados.map((doc: any) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{doc.nombre}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{doc.descripcion}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className={tipoColores[doc.tipo as keyof typeof tipoColores]}>
                        {doc.tipo}
                      </Badge>
                      <Badge className={estadoColores[doc.estado as keyof typeof estadoColores]}>
                        {doc.estado}
                      </Badge>
                      <Badge variant="outline">v{doc.version}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
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
      </div>
    </div>
  );
}
