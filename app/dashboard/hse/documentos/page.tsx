'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Search, Upload, Download, AlertTriangle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const tipoColores = {
  politica: 'bg-blue-100 text-blue-800',
  programa: 'bg-green-100 text-green-800',
  reglamento: 'bg-purple-100 text-purple-800',
  procedimiento: 'bg-orange-100 text-orange-800',
  instructivo: 'bg-pink-100 text-pink-800',
  plan: 'bg-indigo-100 text-indigo-800',
};

const estadoColores = {
  vigente: 'bg-green-100 text-green-800',
  en_revision: 'bg-yellow-100 text-yellow-800',
  obsoleto: 'bg-red-100 text-red-800',
};

export default function HSEDocumentosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [faena, setFaena] = useState('');

  const { data: docData } = useSWR(
    `/api/hse/documentos?tipo=${tipoFiltro !== 'todos' ? tipoFiltro : ''}&faena=${faena}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 600000 } // 10 minutos
  );

  const documentos = docData?.documentos || [];
  const documentosVencidos = documentos.filter((d: any) => {
    const actualizado = new Date(d.fecha_actualizacion);
    const hoy = new Date();
    const diasDesdeActualizacion = Math.floor((hoy.getTime() - actualizado.getTime()) / (1000 * 60 * 60 * 24));
    return diasDesdeActualizacion > 365;
  });

  const filtrados = documentos.filter((d: any) =>
    d.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">{documentosVencidos.length} documento(s) requiere(n) actualización</p>
            <p className="text-sm text-red-700">Última actualización fue más de 1 año atrás</p>
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
            <div className="text-2xl font-bold text-green-600">
              {documentos.filter((d: any) => d.estado === 'vigente').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">En Revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {documentos.filter((d: any) => d.estado === 'en_revision').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Requiere Actualización</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{documentosVencidos.length}</div>
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
            {['politica', 'programa', 'reglamento', 'procedimiento', 'instructivo', 'plan'].map((tipo) => (
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
