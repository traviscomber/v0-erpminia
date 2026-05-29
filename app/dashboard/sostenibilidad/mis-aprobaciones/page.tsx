'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DocumentoAprobacion {
  id: string;
  title: string;
  description?: string;
  status: string;
  approval_level: number;
  approval_level_name: string;
  assigned_to_name: string;
  submitted_at?: string;
  created_by_name?: string;
}

export default function MisAprobacionesPage() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  const { data: myApprovalsData, isLoading, error } = useSWR(
    user ? `/api/sostenibilidad/documentos-flujo?role=${userRole}&status=pending` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    // Determinar rol del usuario - placeholder, será reemplazado con data real
    const roles = ['jefe_sostenibilidad', 'gerente_general'];
    if (user) {
      setUserRole(roles[0]); // Por ahora solo tomar el primer rol
    }
  }, [user]);

  const pendingApprovals = myApprovalsData?.data?.filter(
    (doc: any) =>
      (doc.status === 'pending' || doc.status === 'submitted' || doc.status === 'under_review') &&
      doc.approval_level === 1
  ) || [];

  const approvedByMe = myApprovalsData?.data?.filter((doc: any) => doc.status === 'approved') || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'submitted':
      case 'under_review':
        return 'bg-primary/10 text-primary';
      case 'approved':
        return 'bg-secondary/10 text-secondary';
      case 'rejected':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'submitted':
      case 'under_review':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mis Aprobaciones</h1>
        <p className="text-muted-foreground mt-2">
          Documentos pendientes de tu aprobación en el flujo de sostenibilidad
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendientes de Aprobación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingApprovals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Esperando tu revisión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Aprobados por Ti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{approvedByMe.length}</div>
            <p className="text-xs text-muted-foreground mt-1">En el último mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Rol Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold capitalize">
              {userRole?.replace(/_/g, ' ') || 'Cargando...'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tu nivel de aprobación</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pendientes ({pendingApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Aprobados ({approvedByMe.length})
          </TabsTrigger>
        </TabsList>

        {/* Pendientes */}
        <TabsContent value="pending">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">Cargando documentos pendientes...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-destructive">Error cargando documentos</p>
              </CardContent>
            </Card>
          ) : pendingApprovals.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No hay documentos pendientes de aprobación</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((doc: DocumentoAprobacion) => (
                <Card key={doc.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <h3 className="font-semibold text-foreground">{doc.title}</h3>
                          <Badge className={getStatusColor(doc.status)}>
                            {doc.status === 'under_review' ? 'En Revisión' : 'Pendiente'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{doc.description}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Creado por: {doc.created_by_name}</span>
                          {doc.submitted_at && (
                            <span>Enviado: {new Date(doc.submitted_at).toLocaleDateString('es-CL')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          Ver Documento
                        </Button>
                        <Button size="sm" className="bg-secondary hover:bg-secondary/90">
                          Aprobar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Aprobados */}
        <TabsContent value="approved">
          {approvedByMe.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No hay documentos aprobados aún</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {approvedByMe.map((doc: DocumentoAprobacion) => (
                <Card key={doc.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <h3 className="font-semibold text-foreground">{doc.title}</h3>
                          <Badge className="bg-secondary/10 text-secondary">Aprobado</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
