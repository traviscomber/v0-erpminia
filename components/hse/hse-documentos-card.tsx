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
    const diasDesdeActualiz = Math.floor((hoy.getTime() - actualizado.getTime()) / (1000 * 60 * 60 * 24));
    return diasDesdeActualiz > 365;
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">{documentosVencidos.length} documento(s) requiere(n) actualización</p>
              <p className="text-xs text-red-600">Última actualización fue más de 1 año atrás</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {documentos.map((doc) => (
            <div key={doc.id} className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{doc.nombre}</h4>
                  <p className="text-xs text-muted-foreground">v{doc.version}</p>
                </div>
                <div className="flex gap-1">
                  <Badge className={tipoColores[doc.tipo as keyof typeof tipoColores]}>{doc.tipo}</Badge>
                  <Badge className={estadoColores[doc.estado]}>{doc.estado}</Badge>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Actualizado: {new Date(doc.fecha_actualizacion).toLocaleDateString('es-CL')}
              </p>

              {doc.descripcion && <p className="text-xs text-muted-foreground line-clamp-2">{doc.descripcion}</p>}

              {doc.url_documento && (
                <div className="pt-2">
                  <Button size="sm" variant="outline" className="w-full">
                    <Download className="h-3 w-3 mr-1" />
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
