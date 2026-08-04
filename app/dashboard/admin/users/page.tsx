'use client';

import Link from 'next/link';
import { AlertCircle, ShieldCheck, Upload, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreateUserForm } from '@/components/admin/create-user-form';
import { UsersImportXls } from '@/components/admin/users-import-xls';
import { UsersList } from '@/components/admin/users-list';

export default function AdminUsersPage() {
  const { user, loading, role } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showImport, setShowImport] = useState(false);

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
                Solo administradores pueden acceder a esta sección.
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
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Usuarios</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Crea cuentas, importa usuarios y revisa quién tiene acceso a la organización.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/admin/roles">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Roles y permisos
            </Link>
          </Button>
          <Button variant={showImport ? 'secondary' : 'outline'} onClick={() => setShowImport((value) => !value)}>
            <Upload className="mr-2 h-4 w-4" />
            {showImport ? 'Cerrar importación' : 'Importar usuarios'}
          </Button>
        </div>
      </section>

      <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Administración de accesos">
        <Link
          href="/dashboard/admin/users"
          className="border-b-2 border-primary px-4 py-2 text-sm font-medium text-primary"
        >
          Usuarios
        </Link>
        <Link
          href="/dashboard/admin/roles"
          className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Roles y cargos
        </Link>
      </nav>

      {showImport ? (
        <UsersImportXls
          onImportComplete={() => {
            setRefreshKey((prev) => prev + 1);
            setShowImport(false);
          }}
        />
      ) : null}

      <Card className="shadow-none">
        <CardContent className="p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Crear usuario</h2>
              <p className="text-sm text-muted-foreground">Registra una cuenta y luego asigna su cargo y alcance.</p>
            </div>
          </div>
          <CreateUserForm onUserCreated={() => setRefreshKey((prev) => prev + 1)} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Usuarios registrados</h2>
          <p className="text-sm text-muted-foreground">
            Revisa cuentas existentes y su estado antes de cambiar cargos o permisos.
          </p>
        </div>
        <UsersList key={refreshKey} />
      </section>
    </div>
  );
}
