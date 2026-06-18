'use client';

import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Clock, FileText } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MisAprobacionesPage() {
  const { data: docData, isLoading } = useSWR(
    '/api/sostenibilidad/documentos-flujo',
    fetcher
  );

  const pendingApprovals = (docData?.data || []).filter(
    (doc: any) => doc.status === 'pending' || doc.status === 'submitted' || doc.status === 'under_review'
  ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mis Aprobaciones</h1>
        <p className="text-muted-foreground mt-2">
          Documentos pendientes de tu aprobaciÃ³n en el flujo de sostenibilidad
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingApprovals.length}</div>
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
          <CardTitle>Documentos Pendientes</CardTitle>
          <CardDescription>Esperando tu revisiÃ³n y aprobaciÃ³n</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Cargando...</p>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Sin documentos pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4" />
                      <h3 className="font-semibold">{doc.title || doc.documento_nombre}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{doc.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Ver</Button>
                    <Button size="sm">Aprobar</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

