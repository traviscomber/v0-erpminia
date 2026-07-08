'use client';

import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AssignCargoTab } from '@/components/admin/assign-cargo-tab';
import { RoleMatrixTab } from '@/components/admin/role-matrix-tab';

export default function AdminRolesPage() {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-sidebar-primary" />
      </div>
    );
  }

  if (!user || (role !== 'admin' && role !== 'superadmin')) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md border-destructive/30 bg-destructive/5">
          <CardContent className="flex gap-4 pt-6">
            <AlertCircle className="h-6 w-6 flex-shrink-0 text-destructive" />
            <div>
              <h2 className="font-semibold text-destructive">Acceso denegado</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Solo administradores pueden gestionar roles y cargos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-8 w-8 text-sidebar-primary" />
        <div>
          <h1 className="text-3xl font-bold">Roles y cargos</h1>
          <p className="text-sm text-muted-foreground">
            Asigna cargos a los usuarios y administra la matriz de accesos por módulo.
          </p>
        </div>
      </div>

      <Tabs defaultValue="assign" className="w-full">
        <TabsList>
          <TabsTrigger value="assign">Asignar cargos</TabsTrigger>
          <TabsTrigger value="matrix">Matriz de roles</TabsTrigger>
        </TabsList>
        <TabsContent value="assign" className="mt-4">
          <AssignCargoTab />
        </TabsContent>
        <TabsContent value="matrix" className="mt-4">
          <RoleMatrixTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
