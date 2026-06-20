'use client';

import useSWR from 'swr';
import { CheckCircle2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MisAprobacionesPage() {
  const { data, isLoading } = useSWR('/api/sostenibilidad/documentos-flujo', fetcher);

  const documentos = Array.isArray(data?.data) ? data.data : [];
  const pendientes = documentos.filter(
    (doc: any) => doc.status === 'pending' || doc.status === 'submitted' || doc.status === 'under_review'
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mis aprobaciones</h1>
        <p className="mt-2 text-muted-foreground">
          Documentos pendientes de tu aprobación en el flujo de sostenibilidad
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendientes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rechazados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentos pendientes</CardTitle>
          <CardDescription>Esperando tu revisión y aprobación</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Cargando...</p>
          ) : pendientes.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Sin documentos pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendientes.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <h3 className="font-semibold">{doc.title || doc.documento_nombre}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{doc.description}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Revisar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
