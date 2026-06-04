'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Eye, Download } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const CATEGORY_DISPLAY = {
  'seguridad': { name: 'Documentos de Seguridad', icon: '🛡️' },
  'ambiental': { name: 'Documentos Ambientales', icon: '🌱' },
  'operacional': { name: 'Documentos Operacionales', icon: '⚙️' },
  'laboral': { name: 'Documentos Laborales', icon: '👥' },
};

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;
  const [activeTab, setActiveTab] = useState('aprobados');

  const categoryInfo = CATEGORY_DISPLAY[categoryId as keyof typeof CATEGORY_DISPLAY] || {
    name: 'Documentos',
    icon: '📄'
  };

  const { data, error, isLoading } = useSWR(
    `/api/dashboard/documentos-gestion/${categoryId}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  if (error) return <div className="text-red-500">Error al cargar documentos</div>;
  if (isLoading) return <div className="text-gray-500">Cargando...</div>;

  const stats = data?.stats || { total: 0, aprobados: 0, pendientes: 0, rechazados: 0 };
  const docs = data?.documents || { aprobados: [], pendientes: [], rechazados: [] };

  const getStatusBadge = (estado: string) => {
    if (estado === 'aprobado') return <Badge className="bg-[var(--brand-verde)]">✓ Aprobado</Badge>;
    if (estado.includes('pendiente')) return <Badge className="bg-[var(--secondary)]">⏱ Pendiente</Badge>;
    if (estado === 'rechazado') return <Badge className="bg-[var(--brand-rojo)]">✗ Rechazado</Badge>;
    return <Badge>{estado}</Badge>;
  };

  const DocumentRow = ({ doc }: { doc: any }) => (
    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent">
      <div className="flex-1">
        <div className="font-semibold flex items-center gap-2">
          {doc.nombre}
          {getStatusBadge(doc.estado)}
        </div>
        <p className="text-sm text-muted-foreground">ID: {doc.documentId} • v{doc.version}</p>
        {doc.validador1?.nombre && (
          <p className="text-xs text-muted-foreground mt-1">
            Validador 1: {doc.validador1.nombre} ({doc.validador1.rol})
          </p>
        )}
        {doc.validador2?.nombre && (
          <p className="text-xs text-muted-foreground">
            Validador 2: {doc.validador2.nombre} ({doc.validador2.rol})
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{categoryInfo.name}</h1>
          <p className="text-muted-foreground">Gestión de documentos con flujo de aprobaciones</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Total</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card className="border-[var(--brand-verde)]/30 bg-[var(--brand-verde)]/5">
          <CardHeader className="pb-3"><CardTitle className="text-sm text-[var(--brand-verde)]">Aprobados</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-[var(--brand-verde)]">{stats.aprobados}</div></CardContent>
        </Card>
        <Card className="border-[var(--secondary)]/30 bg-[var(--secondary)]/5">
          <CardHeader className="pb-3"><CardTitle className="text-sm text-[var(--secondary)]">Pendientes</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-[var(--secondary)]">{stats.pendientes}</div></CardContent>
        </Card>
        <Card className="border-[var(--brand-rojo)]/30 bg-[var(--brand-rojo)]/5">
          <CardHeader className="pb-3"><CardTitle className="text-sm text-[var(--brand-rojo)]">Rechazados</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-[var(--brand-rojo)]">{stats.rechazados}</div></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="aprobados">Aprobados ({stats.aprobados})</TabsTrigger>
              <TabsTrigger value="pendientes">Pendientes ({stats.pendientes})</TabsTrigger>
              <TabsTrigger value="rechazados">Rechazados ({stats.rechazados})</TabsTrigger>
            </TabsList>

            <TabsContent value="aprobados" className="space-y-3 mt-4">
              {docs.aprobados?.length ? (
                docs.aprobados.map((doc: any) => <DocumentRow key={doc.id} doc={doc} />)
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay documentos aprobados</p>
              )}
            </TabsContent>

            <TabsContent value="pendientes" className="space-y-3 mt-4">
              {docs.pendientes?.length ? (
                docs.pendientes.map((doc: any) => <DocumentRow key={doc.id} doc={doc} />)
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay documentos pendientes</p>
              )}
            </TabsContent>

            <TabsContent value="rechazados" className="space-y-3 mt-4">
              {docs.rechazados?.length ? (
                docs.rechazados.map((doc: any) => <DocumentRow key={doc.id} doc={doc} />)
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay documentos rechazados</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
