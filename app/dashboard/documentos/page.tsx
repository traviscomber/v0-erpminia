'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  FileText,
  File,
  Clock,
  User,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { mockDocuments } from '@/lib/data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const categories = ['Planificación', 'Seguridad', 'Finanzas', 'Procedimientos'];

const categoryColors: Record<string, string> = {
  'Planificación': 'bg-blue-500/20 text-blue-700',
  'Seguridad': 'bg-red-500/20 text-red-700',
  'Finanzas': 'bg-green-500/20 text-green-700',
  'Procedimientos': 'bg-purple-500/20 text-purple-700',
};

export default function DocumentosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<typeof mockDocuments[0] | null>(null);

  const filteredDocs = mockDocuments.filter(
    (doc) =>
      (doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedCategory === 'all' || doc.category === selectedCategory)
  );

  const getFileIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PDF':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'XLSX':
        return <File className="w-4 h-4 text-green-500" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatFileSize = (size: string) => {
    return size;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
        <p className="text-muted-foreground mt-2">
          Gestión de Documentos, Versiones y Control de Acceso
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredDocs.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Último Actualizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">20 Mar 2024</div>
          </CardContent>
        </Card>
      </div>

      {/* Control Section */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Biblioteca de Documentos</CardTitle>
            <Button className="w-full md:w-auto" onClick={() => alert('Subir nuevo documento próximamente')}>
              <Plus className="w-4 h-4 mr-2" />
              Subir Documento
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col gap-3 md:flex-row md:gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48 bg-input">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors group cursor-pointer"
                onClick={() => setSelectedDoc(doc)}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-muted rounded-lg group-hover:bg-muted/70">
                    {getFileIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate text-sm">{doc.title}</h3>
                    <Badge className={categoryColors[doc.category] || ''}>
                      {doc.category}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{doc.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    <span>{doc.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    <span>{doc.size}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1">
                    <Download className="w-3 h-3 mr-1" />
                    Descargar
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredDocs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No hay documentos que coincidan con tu búsqueda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail View */}
      {selectedDoc && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">{getFileIcon(selectedDoc.type)}</div>
              <div>
                <CardTitle>{selectedDoc.title}</CardTitle>
                <CardDescription>{selectedDoc.id}</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDoc(null)}
            >
              Cerrar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Categoría</p>
                <Badge className={categoryColors[selectedDoc.category] || ''}>
                  {selectedDoc.category}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-semibold">{selectedDoc.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Actualización</p>
                <p className="font-semibold">{selectedDoc.date}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tamaño</p>
                <p className="font-semibold">{selectedDoc.size}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Autor</p>
                <p className="font-semibold">{selectedDoc.author}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex gap-2">
              <Button className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Descargar Documento
              </Button>
              <Button variant="outline" className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                Vista Previa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
