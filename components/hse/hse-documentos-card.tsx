import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, AlertTriangle, Download } from 'lucide-react';

interface HSEDocumento {
  id: string;
  nombre: string;
  tipo: string;
  version: string;
  fecha_actualizacion: string;
  estado: 'vigente' | 'en_revision' | 'obsoleto';
  descripcion?: string;
  url_documento?: string;
}

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

export function HSEDocumentosCard({ documentos, faena }: { documentos: HSEDocumento[]; faena?: string }) {
  const documentosVencidos = documentos.filter((d) => {
    const actualizado = new Date(d.fecha_actualizacion);
    const hoy = new Date();
    const diasDesdeActualizacion = Math.floor((hoy.getTime() - actualizado.getTime()) / (1000 * 60 * 60 * 24));
    return diasDesdeActualizacion > 365;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentos HSE
        </CardTitle>
        <CardDescription>
          {documentos.length} documentos {faena ? `para ${faena}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {documentosVencidos.length > 0 && (
          <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">{documentosVencidos.length} documento(s) requiere(n) actualizacion</p>
              <p className="text-xs text-red-600">Ultima actualizacion hace mas de 1 ano</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {documentos.map((doc) => (
            <div key={doc.id} className="space-y-2 rounded-lg border p-3 transition hover:bg-muted/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold">{doc.nombre}</h4>
                  <p className="text-xs text-muted-foreground">v{doc.version}</p>
                </div>
                <div className="flex gap-1">
                  <Badge className={tipoColores[doc.tipo as keyof typeof tipoColores] || tipoColores.procedimiento}>{doc.tipo}</Badge>
                  <Badge className={estadoColores[doc.estado]}>{doc.estado}</Badge>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Actualizado: {new Date(doc.fecha_actualizacion).toLocaleDateString('es-CL')}
              </p>

              {doc.descripcion && <p className="line-clamp-2 text-xs text-muted-foreground">{doc.descripcion}</p>}

              {doc.url_documento && (
                <div className="pt-2">
                  <Button size="sm" variant="outline" className="w-full">
                    <Download className="mr-1 h-3 w-3" />
                    Descargar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
