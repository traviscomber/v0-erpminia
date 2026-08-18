'use client';

import Link from 'next/link';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssignCargoTab } from '@/components/admin/assign-cargo-tab';
import { RoleMatrixTab } from '@/components/admin/role-matrix-tab';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';

export default function AdminRolesPage() {
  const { user, loading, role } = useAuth();

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-b-primary" /></div>;

  if (!user || (role !== 'admin' && role !== 'superadmin')) {
    return <div className="flex min-h-[50vh] items-center justify-center p-4"><Card className="max-w-md border-destructive/30 bg-destructive/5"><CardContent className="flex gap-3 p-4"><AlertCircle className="h-5 w-5 shrink-0 text-destructive" /><div><h2 className="font-semibold text-destructive">Acceso denegado</h2><p className="mt-1 text-sm text-muted-foreground">Solo administradores pueden gestionar roles y cargos.</p></div></CardContent></Card></div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Administración</PageHeaderEyebrow>
          <PageHeaderTitle>Roles y cargos</PageHeaderTitle>
          <PageHeaderDescription>Asigna cargos y controla el acceso por módulo. Los cambios de matriz requieren aprobación de Jefatura de Área y Gerencia antes de aplicarse.</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions><Button asChild variant="outline" size="sm"><Link href="/dashboard/admin/roles/aprobaciones">Ver aprobaciones</Link></Button></PageHeaderActions>
      </PageHeader>

      <div className="flex items-start gap-3 border-l-2 border-primary/40 pl-4 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div><p className="font-medium">Doble validación obligatoria</p><p className="mt-1 text-muted-foreground">Una solicitud no modifica permisos hasta completar ambas aprobaciones. El solicitante no puede aprobar su propio cambio.</p></div>
      </div>

      <Tabs defaultValue="assign" className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="assign">Asignar cargos</TabsTrigger>
          <TabsTrigger value="matrix">Permisos</TabsTrigger>
        </TabsList>
        <TabsContent value="assign" className="mt-4"><AssignCargoTab /></TabsContent>
        <TabsContent value="matrix" className="mt-4"><RoleMatrixTab /></TabsContent>
      </Tabs>
    </div>
  );
}
