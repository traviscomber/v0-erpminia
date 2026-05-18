'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, FileText, CheckCircle, Clock, AlertCircle, MessageSquare, Download, Eye } from 'lucide-react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface DocumentoFlujo {
  id: string;
  documento_id: string;
  documento_nombre: string;
  version: number;
  estado: string;
  validador1_nombre?: string;
  validador1_accion?: string;
  validador2_nombre?: string;
  validador2_accion?: string;
  creador_nombre: string;
  created_at: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

const estadoSteps = [
  'borrador',
  'pendiente_validador1',
  'aprobado_validador1',
  'pendiente_validador2',
  'aprobado_final',
];

export default function FlujDocumentalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    documento_nombre: '',
    descripcion: '',
    archivo_url: '',
  });

  const { data: documentos = [], mutate } = useSWR('/api/sostenibilidad/documentos-flujo', fetcher);
  const docList = (documentos.data || []) as DocumentoFlujo[];

  const filteredDocs = docList.filter((doc) =>
    (doc.documento_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documento_id.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!filterEstado || doc.estado === filterEstado)
  );

  // Brandbook: primary (naranja), secondary (verde), destructive (rojo), muted (gris)
  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      borrador: 'bg-muted text-muted-foreground',
      pendiente_validador1: 'bg-primary/10 text-primary',
      aprobado_validador1: 'bg-secondary/10 text-secondary',
      pendiente_validador2: 'bg-primary/10 text-primary',
      aprobado_final: 'bg-secondary/10 text-secondary',
    };
    return colors[estado] || 'bg-muted text-muted-foreground';
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'borrador':
        return <FileText className="w-4 h-4" />;
      case 'pendiente_validador1':
      case 'pendiente_validador2':
        return <Clock className="w-4 h-4" />;
      case 'aprobado_final':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sostenibilidad/documentos-flujo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Documento creado correctamente');
        setIsModalOpen(false);
        setFormData({
          documento_nombre: '',
          descripcion: '',
          archivo_url: '',
        });
        mutate();
      } else {
        toast.error('Error al crear documento');
      }
    } catch (error) {
      console.error('[v0] Error creating document:', error);
      toast.error('Error al crear documento');
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Flujo de Aprobación de Documentos</h1>
          <p className="text-muted-foreground">Workflow de 2 validadores: Jefe de Sostenibilidad → Gerente de Operaciones</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Documento</DialogTitle>
              <DialogDescription>
                Crea un nuevo documento para el flujo de aprobación
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre del Documento</Label>
                <Input
                  id="nombre"
                  name="documento_nombre"
                  value={formData.documento_nombre}
                  onChange={handleInputChange}
                  placeholder="Ej: Procedimiento de Seguridad"
                  required
                />
              </div>
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  placeholder="Descripción del documento"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="archivo">URL del Archivo (opcional)</Label>
                <Input
                  id="archivo"
                  name="archivo_url"
                  value={formData.archivo_url}
                  onChange={handleInputChange}
                  placeholder="https://ejemplo.com/archivo.pdf"
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Crear Documento
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workflow Diagram */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-sm">Fases de Aprobación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 overflow-x-auto pb-4">
            {estadoSteps.map((paso, idx) => (
              <div key={paso} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    idx === 0 ? 'bg-[var(--brand-naranja)] text-white' : 'bg-white/10 text-muted-foreground'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 capitalize text-center max-w-20">
                    {paso.replace(/_/g, ' ')}
                  </span>
                </div>
                {idx < estadoSteps.length - 1 && <div className="w-8 h-0.5 bg-white/10" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different statuses */}
      <Tabs defaultValue="todas" className="mb-8">
        <TabsList>
          <TabsTrigger value="todas">Todos ({docList.length})</TabsTrigger>
          <TabsTrigger value="borrador">Borradores ({docList.filter(d => d.estado === 'borrador').length})</TabsTrigger>
          <TabsTrigger value="pendiente_validador1">Pendiente V1 ({docList.filter(d => d.estado === 'pendiente_validador1').length})</TabsTrigger>
          <TabsTrigger value="pendiente_validador2">Pendiente V2 ({docList.filter(d => d.estado === 'pendiente_validador2').length})</TabsTrigger>
          <TabsTrigger value="aprobado_final">Aprobados ({docList.filter(d => d.estado === 'aprobado_final').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="space-y-4">
          {/* Search */}
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Buscar documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="icon">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Documents List */}
          <div className="space-y-4">
            {filteredDocs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay documentos</p>
            ) : (
              filteredDocs.map((doc) => (
                <Card key={doc.id} className="border-l-4 border-l-[var(--brand-naranja)]">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getEstadoIcon(doc.estado)}
                          <h3 className="text-lg font-bold">{doc.documento_nombre}</h3>
                          <Badge className={getEstadoColor(doc.estado)}>
                            v{doc.version}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">ID: {doc.documento_id}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Validador 1 */}
                      <div className="border border-white/10 rounded-lg p-4">
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</div>
                          Jefe de Sostenibilidad
                        </h4>
                        {doc.validador1_nombre ? (
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground">
                              <span className="font-medium">Revisor:</span> {doc.validador1_nombre}
                            </p>
                            <p className="text-muted-foreground">
                              <span className="font-medium">Acción:</span>
                              <Badge className="ml-2" variant="outline">
                                {doc.validador1_accion || 'Pendiente'}
                              </Badge>
                            </p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm italic">Pendiente de revisión</p>
                        )}
                      </div>

                      {/* Validador 2 */}
                      <div className="border border-white/10 rounded-lg p-4">
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs">2</div>
                          Gerente de Operaciones
                        </h4>
                        {doc.validador2_nombre ? (
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground">
                              <span className="font-medium">Revisor:</span> {doc.validador2_nombre}
                            </p>
                            <p className="text-muted-foreground">
                              <span className="font-medium">Acción:</span>
                              <Badge className="ml-2" variant="outline">
                                {doc.validador2_accion || 'Pendiente'}
                              </Badge>
                            </p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm italic">Pendiente de revisión V1</p>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs text-muted-foreground">
                      <span>Creador: {doc.creador_nombre}</span>
                      <span>{new Date(doc.created_at).toLocaleDateString('es-CL')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
