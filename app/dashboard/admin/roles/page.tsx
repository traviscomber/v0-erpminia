'use client';

import Link from 'next/link';
import { AlertCircle, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssignCargoTab } from '@/components/admin/assign-cargo-tab';
import { RoleMatrixTab } from '@/components/admin/role-matrix-tab';

export default function AdminRolesPage() {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-b-primary" />
      </div>
    );
  }

  if (!user || (role !== 'admin' && role !== 'superadmin')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <Card className="max-w-md border-destructive/30 bg-destructive/5">
          <CardContent className="flex gap-4 pt-6">
            <AlertCircle className="h-6 w-6 shrink-0 text-destructive" />
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
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Administración · Accesos</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Roles y cargos</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Asigna responsabilidades y controla el acceso por módulo sin modificar la información operacional.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/admin/users">
            <Users className="mr-2 h-4 w-4" />
            Ver usuarios
          </Link>
        </Button>
      </section>

      <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Administración de accesos">
        <Link
          href="/dashboard/admin/users"
          className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Usuarios
        </Link>
        <Link
          href="/dashboard/admin/roles"
          className="border-b-2 border-primary px-4 py-2 text-sm font-medium text-primary"
        >
          Roles y cargos
        </Link>
      </nav>

      <Card className="border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="flex gap-3 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">Control de acceso centralizado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Primero asigna el cargo correcto; luego define qué módulos puede utilizar ese cargo en la matriz.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="assign" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="assign">Asignar cargos</TabsTrigger>
          <TabsTrigger value="matrix">Matriz de permisos</TabsTrigger>
        </TabsList>
        <TabsContent value="assign" className="mt-5">
          <AssignCargoTab />
        </TabsContent>
        <TabsContent value="matrix" className="mt-5">
          <RoleMatrixTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
